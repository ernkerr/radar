"""Agent dispatcher (D6).

Takes a relevant change with its relevance analysis and:
1. Creates an alert in the alerts table
2. Proposes actions based on the change type and urgency
3. Writes proposed actions to the actions table (pending approval)

This module is the final stage of the detection-relevance-dispatch pipeline.
It translates analytical results into user-facing alerts and actionable
proposals.  Every proposed action requires human approval before execution
(design decision D4 -- human-in-the-loop by default).

Action type taxonomy:
    - task:       A manual review task for the compliance team (always created).
    - outreach:   Draft a notification to a supplier about a compliance change.
                  Created when a HIGH-urgency change mentions a known supplier.
    - hold:       Flag to review inventory and consider halting shipments.
                  Created for recalls, detentions, or violations at HIGH urgency.
    - erp_update: Update compliance flags on shipments from affected countries.
                  Created for HIGH or MEDIUM urgency with country-matched rules.
"""

import json

from supabase import Client


def dispatch(db: Client, company_id: str, change: dict, relevance: dict, raw_doc: dict) -> dict:
    """Create an alert and propose actions for a relevant change.

    This is the main entry point for the dispatch layer.  It persists one
    alert row and zero or more action rows to the database.

    Args:
        db:         Supabase client (service role).
        company_id: The company this alert belongs to.
        change:     The change record (from the changes table).
        relevance:  Output of analyze_relevance() -- score, urgency, rules, etc.
        raw_doc:    The full raw_documents row for context.

    Returns:
        {"alert_id": str, "actions_created": int}
    """
    meta = raw_doc.get("metadata_json", {})
    if isinstance(meta, str):
        meta = json.loads(meta)

    # ── Create the alert ──
    # The alert is the primary user-facing record.  Each field serves a
    # specific purpose in the UI:
    alert_data = {
        "company_id": company_id,           # Scopes the alert to one company
        "change_id": change.get("id"),       # Links back to the change record
        "title": _generate_title(meta, raw_doc),  # Headline shown in alert list
        "summary": change.get("diff_summary", "")[:500],  # What changed (truncated)
        "why_it_matters": relevance.get("why_it_matters", ""),  # Plain-English explanation
        "relevance_score": relevance.get("score", 0),   # 0.0-1.0 confidence
        "urgency": relevance.get("urgency", "LOW"),      # Triage level
        "matched_rules": relevance.get("matched_rules", []),  # Audit trail of which rules fired
        "llm_reasoning": relevance.get("llm_reasoning"),  # LLM explanation (None if rules-only)
        "status": "new",  # Lifecycle: new -> acknowledged -> resolved
    }

    alert = db.table("alerts").insert(alert_data).execute().data[0]

    # ── Propose actions based on urgency and matched rules ──
    # Actions are *proposals*, not executions.  They sit in "pending" status
    # until a human approves them (see requires_approval below).
    actions = _propose_actions(relevance, meta, raw_doc)
    actions_created = 0

    for action in actions:
        db.table("actions").insert({
            "company_id": company_id,
            "alert_id": alert["id"],
            "action_type": action["type"],       # One of: task, outreach, hold, erp_update
            "description": action["description"],
            "payload_json": action.get("payload", {}),  # Machine-readable params for execution
            # D4 design decision: requires_approval defaults to True.
            # The system should NEVER auto-execute actions without human
            # review.  Regulatory compliance errors can have serious legal
            # and financial consequences, so a human must confirm before
            # any outreach is sent, shipments are held, or ERP flags change.
            "requires_approval": True,
            "status": "pending",  # Lifecycle: pending -> approved -> executed (or rejected)
        }).execute()
        actions_created += 1

    return {"alert_id": alert["id"], "actions_created": actions_created}


def _generate_title(meta: dict, raw_doc: dict) -> str:
    """Generate a concise alert title from metadata.

    Tries several metadata fields in priority order (title > product
    description > label) and falls back to a generic string.  Titles are
    truncated to 200 chars to fit the alert list UI.
    """
    if meta.get("title"):
        return str(meta["title"])[:200]
    if meta.get("product_description"):
        return f"FDA: {str(meta['product_description'])[:180]}"
    if meta.get("label"):
        return str(meta["label"])[:200]
    return f"Change detected in {raw_doc.get('source_id', 'unknown source')}"


def _propose_actions(relevance: dict, meta: dict, raw_doc: dict) -> list[dict]:
    """Propose actions based on the change's urgency and matched rules.

    The action set is built incrementally:
      1. A "task" action is ALWAYS created (every alert deserves review).
      2. HIGH urgency adds supplier outreach and/or shipment holds.
      3. HIGH or MEDIUM urgency with country rules adds ERP flag updates.

    Returns a list of action dicts with type, description, and payload.
    """
    actions = []
    urgency = relevance.get("urgency", "LOW")
    rules = relevance.get("matched_rules", [])
    source_id = raw_doc.get("source_id", "")

    # ── Base action: always create a review task ──
    # Even LOW urgency changes that passed relevance deserve a human look.
    actions.append({
        "type": "task",
        "description": f"Review regulatory change and assess impact",
        "payload": {"source": source_id},
    })

    # ── HIGH urgency: add supplier outreach and/or shipment hold ──
    if urgency == "HIGH":
        # If a known supplier was mentioned, draft an outreach notification.
        # This helps the compliance team proactively inform the supplier
        # about the regulatory change (e.g. their product was recalled).
        supplier_rules = [r for r in rules if r.startswith("supplier:")]
        if supplier_rules:
            supplier_name = supplier_rules[0].split(":", 1)[1]
            actions.append({
                "type": "outreach",
                "description": f"Draft supplier notification to {supplier_name} regarding compliance change",
                "payload": {"supplier": supplier_name},
            })

        # If enforcement keywords are present (recall, detention, etc.),
        # propose a shipment hold so the team reviews affected inventory.
        if any(kw in str(meta).lower() for kw in ["recall", "detained", "refused", "violation"]):
            actions.append({
                "type": "hold",
                "description": "Review affected inventory and consider hold on related shipments",
                "payload": {},
            })

    # ── HIGH or MEDIUM urgency: add ERP compliance flag update ──
    # When country-specific rules matched, propose updating the ERP system
    # to flag incoming shipments from those countries for extra scrutiny.
    if urgency in ("HIGH", "MEDIUM"):
        country_rules = [r for r in rules if r.startswith("country:")]
        if country_rules:
            actions.append({
                "type": "erp_update",
                "description": f"Update compliance flags for shipments from {country_rules[0].split(':', 1)[1]}",
                "payload": {"countries": [r.split(":", 1)[1] for r in country_rules]},
            })

    return actions
