"""Agent dispatcher (D6).

Takes a relevant change with its relevance analysis and:
1. Creates an alert in the alerts table
2. Proposes actions based on the change type and urgency
3. Writes proposed actions to the actions table (pending approval)
"""

import json

from supabase import Client


def dispatch(db: Client, company_id: str, change: dict, relevance: dict, raw_doc: dict) -> dict:
    """Create an alert and propose actions for a relevant change.

    Returns:
        {"alert_id": str, "actions_created": int}
    """
    meta = raw_doc.get("metadata_json", {})
    if isinstance(meta, str):
        meta = json.loads(meta)

    # Create the alert
    alert_data = {
        "company_id": company_id,
        "change_id": change.get("id"),
        "title": _generate_title(meta, raw_doc),
        "summary": change.get("diff_summary", "")[:500],
        "why_it_matters": relevance.get("why_it_matters", ""),
        "relevance_score": relevance.get("score", 0),
        "urgency": relevance.get("urgency", "LOW"),
        "matched_rules": relevance.get("matched_rules", []),
        "llm_reasoning": relevance.get("llm_reasoning"),
        "status": "new",
    }

    alert = db.table("alerts").insert(alert_data).execute().data[0]

    # Propose actions based on urgency and change type
    actions = _propose_actions(relevance, meta, raw_doc)
    actions_created = 0

    for action in actions:
        db.table("actions").insert({
            "company_id": company_id,
            "alert_id": alert["id"],
            "action_type": action["type"],
            "description": action["description"],
            "payload_json": action.get("payload", {}),
            "requires_approval": True,  # D4: default to human approval
            "status": "pending",
        }).execute()
        actions_created += 1

    return {"alert_id": alert["id"], "actions_created": actions_created}


def _generate_title(meta: dict, raw_doc: dict) -> str:
    """Generate a concise alert title from metadata."""
    if meta.get("title"):
        return str(meta["title"])[:200]
    if meta.get("product_description"):
        return f"FDA: {str(meta['product_description'])[:180]}"
    if meta.get("label"):
        return str(meta["label"])[:200]
    return f"Change detected in {raw_doc.get('source_id', 'unknown source')}"


def _propose_actions(relevance: dict, meta: dict, raw_doc: dict) -> list[dict]:
    """Propose actions based on the change's urgency and matched rules."""
    actions = []
    urgency = relevance.get("urgency", "LOW")
    rules = relevance.get("matched_rules", [])
    source_id = raw_doc.get("source_id", "")

    # Always create a review task
    actions.append({
        "type": "task",
        "description": f"Review regulatory change and assess impact",
        "payload": {"source": source_id},
    })

    # HIGH urgency: additional actions
    if urgency == "HIGH":
        # If supplier-related, draft outreach
        supplier_rules = [r for r in rules if r.startswith("supplier:")]
        if supplier_rules:
            supplier_name = supplier_rules[0].split(":", 1)[1]
            actions.append({
                "type": "outreach",
                "description": f"Draft supplier notification to {supplier_name} regarding compliance change",
                "payload": {"supplier": supplier_name},
            })

        # If it's a recall or enforcement
        if any(kw in str(meta).lower() for kw in ["recall", "detained", "refused", "violation"]):
            actions.append({
                "type": "hold",
                "description": "Review affected inventory and consider hold on related shipments",
                "payload": {},
            })

    # MEDIUM urgency: task + potential ERP update
    if urgency in ("HIGH", "MEDIUM"):
        country_rules = [r for r in rules if r.startswith("country:")]
        if country_rules:
            actions.append({
                "type": "erp_update",
                "description": f"Update compliance flags for shipments from {country_rules[0].split(':', 1)[1]}",
                "payload": {"countries": [r.split(":", 1)[1] for r in country_rules]},
            })

    return actions
