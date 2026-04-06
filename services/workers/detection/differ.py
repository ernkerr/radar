"""Change detection engine.

Compares raw_documents across ingestion runs to detect:
- New documents (external_id never seen before for this source)
- Modified documents (same external_id, different content_hash)
- Removed documents (external_id was present before, missing now)

Writes detected changes to the `changes` table, scoped per company.

How the two-run comparison works:
    Each time an ingestion worker fetches a source (e.g. FDA recalls RSS),
    it logs a row in `ingestion_log` with status "success" and a timestamp.
    This module pulls the two most recent successful runs and partitions
    `raw_documents` by their `fetched_at` timestamp into "current" (fetched
    during or after the latest run) and "previous" (everything before that).
    By comparing these two sets on `external_id`, we detect new, modified,
    and (eventually) removed documents.

content_hash vs. differ:
    The ingestion layer already computes a `content_hash` (SHA-256 of
    raw_content) and stores it on each raw_document row.  That hash is used
    as a *cheap equality check* here in the differ -- if two documents share
    the same external_id but have different content_hash values, we know the
    content changed without needing to read the full body.  The differ's job
    is to *classify* those changes (new / modified) and produce a
    human-readable diff_summary that downstream agents can act on.
"""

import difflib
import json

from supabase import Client


def detect_changes(db: Client, source_id: str) -> list[dict]:
    """Detect changes for a source by comparing the two most recent ingestion runs.

    Returns a list of change dicts ready to insert into the changes table.
    Each dict has: raw_document_id, change_type ("new" or "modified"),
    and diff_summary (a short human-readable string).
    """
    # ── Step 1: Fetch the two most recent successful ingestion runs ──
    # We need at least two runs to compute a delta.  If this source has
    # only been ingested once (or never), we fall back to treating every
    # document as "new" via _detect_all_new.
    runs = (
        db.table("ingestion_log")
        .select("id, ran_at")
        .eq("source_id", source_id)
        .eq("status", "success")
        .order("ran_at", desc=True)
        .limit(2)
        .execute()
    )

    if len(runs.data) < 2:
        # First-ever run (or only one successful run) -- no prior state to
        # compare against, so every document is considered "new".
        return _detect_all_new(db, source_id)

    # Timestamps that partition documents into current vs. previous sets.
    current_run_time = runs.data[0]["ran_at"]
    previous_run_time = runs.data[1]["ran_at"]

    # ── Step 2: Partition documents into current and previous sets ──
    # "Current" = documents fetched during the latest ingestion run
    # (i.e. fetched_at >= the start of the previous run, which means they
    # were pulled in the most recent cycle).
    current_docs = (
        db.table("raw_documents")
        .select("id, external_id, content_hash, raw_content, metadata_json")
        .eq("source_id", source_id)
        .gte("fetched_at", previous_run_time)
        .execute()
    ).data

    # "Previous" = documents that existed before the latest run.  These
    # represent the last-known state of each external_id.
    previous_docs = (
        db.table("raw_documents")
        .select("id, external_id, content_hash, raw_content")
        .eq("source_id", source_id)
        .lt("fetched_at", previous_run_time)
        .execute()
    ).data

    # ── Step 3: Build a lookup dict keyed by external_id ──
    # external_id is the source's own identifier (e.g. FDA recall number,
    # Federal Register document ID).  It lets us match the "same" document
    # across two different ingestion runs.
    prev_by_id = {}
    for doc in previous_docs:
        if doc["external_id"]:
            prev_by_id[doc["external_id"]] = doc

    # ── Step 4: Walk current documents and classify each one ──
    changes = []

    for doc in current_docs:
        ext_id = doc.get("external_id")

        if not ext_id or ext_id not in prev_by_id:
            # NEW: This external_id was never seen in previous runs.
            # Documents without an external_id are also treated as new
            # because we have no way to correlate them with prior state.
            changes.append({
                "raw_document_id": doc["id"],
                "change_type": "new",
                "diff_summary": _summarize_new(doc),
            })
        elif doc["content_hash"] != prev_by_id[ext_id]["content_hash"]:
            # MODIFIED: Same external_id exists in both runs, but the
            # content_hash differs -- the source updated this document.
            # We generate a unified diff so reviewers can see what changed.
            changes.append({
                "raw_document_id": doc["id"],
                "change_type": "modified",
                "diff_summary": _generate_diff(prev_by_id[ext_id], doc),
            })
        # else: content_hash matches -- document is unchanged, nothing to do.

    return changes


def _detect_all_new(db: Client, source_id: str) -> list[dict]:
    """First run -- treat all documents as new.

    Called when there are fewer than two successful ingestion runs, so there
    is no prior state to diff against.  Every document in the source is
    emitted as a "new" change so the downstream pipeline can evaluate its
    relevance and potentially create alerts.
    """
    docs = (
        db.table("raw_documents")
        .select("id, external_id, raw_content, metadata_json")
        .eq("source_id", source_id)
        .execute()
    ).data

    return [
        {
            "raw_document_id": doc["id"],
            "change_type": "new",
            "diff_summary": _summarize_new(doc),
        }
        for doc in docs
    ]


def _summarize_new(doc: dict) -> str:
    """Create a brief summary of a new document.

    Extracts the most useful metadata fields (title, type, date, recall
    reason, source label) and joins them with pipe separators into a
    single-line summary.  Each field is truncated to 200 chars to keep the
    summary compact -- it is stored in the changes table and shown in the
    alert UI.  Falls back to a generic string if no metadata is available.
    """
    meta = doc.get("metadata_json", {})
    # metadata_json may be stored as a JSON string rather than a parsed dict
    # (depends on how the ingestion connector serialized it).
    if isinstance(meta, str):
        meta = json.loads(meta)

    parts = []
    if meta.get("title"):
        parts.append(f"Title: {meta['title'][:200]}")
    if meta.get("type"):
        parts.append(f"Type: {meta['type']}")
    if meta.get("publication_date"):
        parts.append(f"Date: {meta['publication_date']}")
    if meta.get("reason_for_recall"):
        parts.append(f"Reason: {meta['reason_for_recall'][:200]}")
    if meta.get("label"):
        parts.append(f"Source: {meta['label']}")

    return " | ".join(parts) if parts else "New document detected"


def _generate_diff(old_doc: dict, new_doc: dict) -> str:
    """Generate a human-readable diff between old and new document content.

    Produces a unified-diff format string showing what changed.  The output
    is truncated to 500 characters because:
      1. Diffs are stored in the `changes.diff_summary` column, which is
         meant for quick human review, not full audit trails.
      2. Downstream agents (rules + LLM) only need enough context to assess
         relevance -- sending megabytes of diff is wasteful and can blow
         token budgets in the LLM path.
      3. The full content is always available via the raw_document row if
         a deeper inspection is needed.
    """
    old_content = old_doc.get("raw_content", "")
    new_content = new_doc.get("raw_content", "")

    # For JSON content, pretty-print with sorted keys before diffing.
    # This avoids false diffs caused by key-ordering changes in the API
    # response (e.g. FDA sometimes reorders JSON fields between fetches).
    try:
        old_parsed = json.loads(old_content)
        new_parsed = json.loads(new_content)
        old_lines = json.dumps(old_parsed, indent=2, sort_keys=True).splitlines()
        new_lines = json.dumps(new_parsed, indent=2, sort_keys=True).splitlines()
    except (json.JSONDecodeError, TypeError):
        # Non-JSON content (HTML, plain text) -- diff the raw text directly.
        # Truncate to 5000 chars per side to keep diffing fast on large pages.
        old_lines = old_content[:5000].splitlines()
        new_lines = new_content[:5000].splitlines()

    # n=1 means show 1 line of context around each change (compact output).
    diff = list(difflib.unified_diff(old_lines, new_lines, lineterm="", n=1))

    if not diff:
        # content_hash differed but the normalized text is identical --
        # likely a whitespace-only or encoding change.
        return "Content changed but diff is empty (possible whitespace change)"

    # Truncate: keep at most 30 diff lines, then hard-cap at 500 characters.
    # This ensures the summary stays concise for storage and display.
    return "\n".join(diff[:30])[:500]
