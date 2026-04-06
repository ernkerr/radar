"""P1 pipeline: change detection -> relevance -> alert dispatch.

Runs after ingestion to process new/changed documents and generate
company-scoped alerts with proposed actions.

Full pipeline flow:
    1. DETECT  -- differ.py compares the two most recent ingestion runs for
       the given source and emits a list of changes (new / modified docs).
    2. RELEVANCE -- For each (company, change) pair, relevance.py runs
       rule-based matching and optionally LLM analysis to score how
       relevant the change is to that company.
    3. DISPATCH -- For changes that pass the relevance threshold,
       dispatcher.py creates an alert and proposes actions in the database.

Why changes are scoped per-company:
    A single source (e.g. FDA import refusals) produces one set of raw
    changes, but each company has different products, suppliers, and risk
    profiles.  The same FDA refusal might be HIGH urgency for Company A
    (who imports that species from that country) and irrelevant to
    Company B.  So the pipeline evaluates every change against every
    company independently, creating company-scoped change records,
    alerts, and actions.

Processing order:
    The pipeline iterates companies (outer loop) x changes (inner loop).
    This means all companies are processed for each source in a single
    run_pipeline call.  The caller (typically the worker main loop) calls
    run_pipeline once per source after ingestion completes.
"""

from supabase import Client

from detection.differ import detect_changes
from agents.relevance import analyze_relevance
from agents.dispatcher import dispatch


def run_pipeline(db: Client, source_id: str, use_llm: bool = False) -> dict:
    """Run the full detection -> relevance -> dispatch pipeline for a source.

    This is the top-level orchestrator.  It coordinates the three pipeline
    stages and returns aggregate counts of what was created.

    Args:
        db:         Supabase client (service role -- needs write access to
                    changes, alerts, and actions tables).
        source_id:  Which source to process (e.g. "fda_recalls", "federal_register").
        use_llm:    Whether to use Claude for ambiguous changes.  Defaults
                    to False to avoid unexpected API costs; the worker
                    entrypoint can enable it via config or CLI flag.

    Returns:
        {"changes": int, "alerts": int, "actions": int}
    """
    # ── Stage 1: DETECT ──
    # Compare the two most recent ingestion runs for this source and
    # identify new/modified documents.  Returns lightweight change dicts
    # (not yet persisted to the changes table -- that happens per-company below).
    print(f"  Detecting changes for {source_id}...")
    changes = detect_changes(db, source_id)
    print(f"  Found {len(changes)} changes")

    if not changes:
        # No new or modified documents since last run -- nothing to do.
        return {"changes": 0, "alerts": 0, "actions": 0}

    # ── Load all companies ──
    # Every company in the system is evaluated against every change.
    # This is a deliberate design choice: sources are shared (e.g. FDA data
    # is relevant to all seafood importers), but relevance is personal.
    # The per-company relevance scoring below filters out irrelevant noise.
    companies = db.table("companies").select("id").execute().data
    print(f"  Processing for {len(companies)} companies")

    total_alerts = 0
    total_actions = 0

    # ── Stage 2 + 3: RELEVANCE + DISPATCH (per company, per change) ──
    for company in companies:
        company_id = company["id"]

        for change_data in changes:
            # Fetch the full raw_document row -- needed by both the relevance
            # engine (to search the content) and the dispatcher (for metadata).
            raw_doc = (
                db.table("raw_documents")
                .select("*")
                .eq("id", change_data["raw_document_id"])
                .single()
                .execute()
            ).data

            if not raw_doc:
                # Defensive: skip if the raw_document was deleted between
                # detection and processing (unlikely but possible).
                continue

            # Persist a company-scoped change record.  Each company gets its
            # own row in the `changes` table so that change lifecycle
            # (acknowledged, resolved) can be tracked independently per company.
            change_insert = db.table("changes").insert({
                "company_id": company_id,
                "raw_document_id": change_data["raw_document_id"],
                "change_type": change_data["change_type"],
                "diff_summary": change_data.get("diff_summary", ""),
            }).execute()
            change_record = change_insert.data[0]

            # ── Stage 2: RELEVANCE ──
            # Score how relevant this change is to this specific company.
            # Uses rules first, optionally escalates to LLM (see relevance.py).
            relevance = analyze_relevance(
                db, company_id, change_record, raw_doc, use_llm=use_llm
            )

            if not relevance["relevant"]:
                # Change is not relevant to this company -- skip dispatch.
                # The change record still exists for audit purposes, but no
                # alert or actions are created.
                continue

            # ── Stage 3: DISPATCH ──
            # Create an alert and propose actions for this relevant change.
            # Actions are created in "pending" status and require human
            # approval before execution (D4).
            result = dispatch(db, company_id, change_record, relevance, raw_doc)
            total_alerts += 1
            total_actions += result["actions_created"]

    print(f"  Created {total_alerts} alerts, {total_actions} actions")
    return {"changes": len(changes), "alerts": total_alerts, "actions": total_actions}
