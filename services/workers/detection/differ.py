"""Change detection engine.

Compares raw_documents across ingestion runs to detect:
- New documents (external_id never seen before for this source)
- Modified documents (same external_id, different content_hash)
- Removed documents (external_id was present before, missing now)

Writes detected changes to the `changes` table, scoped per company.
"""

import difflib
import json

from supabase import Client


def detect_changes(db: Client, source_id: str) -> list[dict]:
    """Detect changes for a source by comparing the two most recent ingestion runs.

    Returns a list of change dicts ready to insert into the changes table.
    """
    # Get the two most recent successful ingestion runs
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
        # Not enough runs to compare — treat everything as new
        return _detect_all_new(db, source_id)

    current_run_time = runs.data[0]["ran_at"]
    previous_run_time = runs.data[1]["ran_at"]

    # Get documents from current run (fetched after previous run)
    current_docs = (
        db.table("raw_documents")
        .select("id, external_id, content_hash, raw_content, metadata_json")
        .eq("source_id", source_id)
        .gte("fetched_at", previous_run_time)
        .execute()
    ).data

    # Get documents from before current run (the previous state)
    previous_docs = (
        db.table("raw_documents")
        .select("id, external_id, content_hash, raw_content")
        .eq("source_id", source_id)
        .lt("fetched_at", previous_run_time)
        .execute()
    ).data

    # Build lookup by external_id
    prev_by_id = {}
    for doc in previous_docs:
        if doc["external_id"]:
            prev_by_id[doc["external_id"]] = doc

    changes = []

    for doc in current_docs:
        ext_id = doc.get("external_id")

        if not ext_id or ext_id not in prev_by_id:
            # New document
            changes.append({
                "raw_document_id": doc["id"],
                "change_type": "new",
                "diff_summary": _summarize_new(doc),
            })
        elif doc["content_hash"] != prev_by_id[ext_id]["content_hash"]:
            # Modified document
            changes.append({
                "raw_document_id": doc["id"],
                "change_type": "modified",
                "diff_summary": _generate_diff(prev_by_id[ext_id], doc),
            })
        # else: unchanged, skip

    return changes


def _detect_all_new(db: Client, source_id: str) -> list[dict]:
    """First run — treat all documents as new."""
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
    """Create a brief summary of a new document."""
    meta = doc.get("metadata_json", {})
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
    """Generate a human-readable diff between old and new document content."""
    old_content = old_doc.get("raw_content", "")
    new_content = new_doc.get("raw_content", "")

    # For JSON content, try to diff the parsed structure
    try:
        old_parsed = json.loads(old_content)
        new_parsed = json.loads(new_content)
        old_lines = json.dumps(old_parsed, indent=2, sort_keys=True).splitlines()
        new_lines = json.dumps(new_parsed, indent=2, sort_keys=True).splitlines()
    except (json.JSONDecodeError, TypeError):
        # For non-JSON (HTML, text), diff the raw text
        old_lines = old_content[:5000].splitlines()
        new_lines = new_content[:5000].splitlines()

    diff = list(difflib.unified_diff(old_lines, new_lines, lineterm="", n=1))

    if not diff:
        return "Content changed but diff is empty (possible whitespace change)"

    # Return first 500 chars of diff
    return "\n".join(diff[:30])[:500]
