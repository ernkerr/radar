"""P1 pipeline: change detection → relevance → alert dispatch.

Runs after ingestion to process new/changed documents and generate
company-scoped alerts with proposed actions.
"""

from supabase import Client

from detection.differ import detect_changes
from agents.relevance import analyze_relevance
from agents.dispatcher import dispatch


def run_pipeline(db: Client, source_id: str, use_llm: bool = False) -> dict:
    """Run the full detection → relevance → dispatch pipeline for a source.

    Args:
        db: Supabase client (service role)
        source_id: Which source to process
        use_llm: Whether to use Claude for ambiguous changes

    Returns:
        {"changes": int, "alerts": int, "actions": int}
    """
    print(f"  Detecting changes for {source_id}...")
    changes = detect_changes(db, source_id)
    print(f"  Found {len(changes)} changes")

    if not changes:
        return {"changes": 0, "alerts": 0, "actions": 0}

    # Get all companies (every company cares about every source)
    companies = db.table("companies").select("id").execute().data
    print(f"  Processing for {len(companies)} companies")

    total_alerts = 0
    total_actions = 0

    for company in companies:
        company_id = company["id"]

        for change_data in changes:
            # Get the raw document
            raw_doc = (
                db.table("raw_documents")
                .select("*")
                .eq("id", change_data["raw_document_id"])
                .single()
                .execute()
            ).data

            if not raw_doc:
                continue

            # Insert the change record
            change_insert = db.table("changes").insert({
                "company_id": company_id,
                "raw_document_id": change_data["raw_document_id"],
                "change_type": change_data["change_type"],
                "diff_summary": change_data.get("diff_summary", ""),
            }).execute()
            change_record = change_insert.data[0]

            # Analyze relevance
            relevance = analyze_relevance(
                db, company_id, change_record, raw_doc, use_llm=use_llm
            )

            if not relevance["relevant"]:
                continue

            # Dispatch alert + actions
            result = dispatch(db, company_id, change_record, relevance, raw_doc)
            total_alerts += 1
            total_actions += result["actions_created"]

    print(f"  Created {total_alerts} alerts, {total_actions} actions")
    return {"changes": len(changes), "alerts": total_alerts, "actions": total_actions}
