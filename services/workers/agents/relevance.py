"""Hybrid relevance engine (D5).

1. Rule-based matching runs first (fast, deterministic)
2. If rules don't match but the change looks significant, Claude analyzes it
3. Returns combined relevance score, reasoning, and urgency

Design decision (D5 -- hybrid approach):
    Pure rule-based matching is fast and predictable but brittle -- it can
    only catch patterns we have explicitly coded (species names, country
    names, etc.).  Pure LLM analysis is flexible but slow and expensive
    (~$0.003 per call).  The hybrid approach gets the best of both:

    - Strong rule matches (score >= 0.5) are returned immediately with no
      LLM call.  This covers the majority of clearly-relevant changes.
    - Weak or no rule matches are escalated to Claude for semantic analysis.
      This catches novel patterns like indirect supply-chain effects or
      regulatory language that doesn't mention specific species/countries.
    - If the LLM is unavailable or disabled, we gracefully fall back to the
      rule result alone (possibly marking the change as irrelevant).
"""

import json
import os

from supabase import Client

from agents.rules import match_rules


def analyze_relevance(
    db: Client,
    company_id: str,
    change: dict,
    raw_doc: dict,
    use_llm: bool = True,
) -> dict:
    """Analyze a change's relevance to a company using rules + optional LLM.

    This is the main entry point for the relevance layer.  It orchestrates
    the two-phase analysis and merges the results into a single dict.

    Args:
        db:         Supabase client (service role).
        company_id: Which company to evaluate relevance for.
        change:     Change record from the detection layer (has change_type,
                    diff_summary, raw_document_id).
        raw_doc:    The full raw_documents row for the changed document.
        use_llm:    Feature flag -- set to False to skip the LLM entirely
                    (useful for testing or when running without API keys).

    Returns:
        {
            "relevant": bool,
            "needs_review": bool,       # D17: ambiguous matches surface for human review
            "confidence": "high" | "medium" | "low",
            "score": float,
            "urgency": "HIGH" | "MEDIUM" | "LOW",
            "matched_rules": [...],
            "llm_reasoning": str | None,
            "why_it_matters": str,
        }

    Three-state relevance model (D17):
        - relevant=True,  needs_review=False → confident match, create alert + actions
        - relevant=True,  needs_review=True  → ambiguous, create alert flagged for review, no auto-actions
        - relevant=False, needs_review=False → confident non-match, skip

    CRITICAL: We NEVER silently discard something we're unsure about (D17).
    False negatives are more expensive than false positives — a missed
    regulatory change on a large shipment can cost thousands of dollars.
    When in doubt, we surface it for human review.
    """
    # ── Phase 1: Deterministic rule matching (always runs) ──
    rule_result = match_rules(db, company_id, change, raw_doc)

    # ── Strong rule match (score >= 0.5) → confident relevant ──
    if rule_result["relevant"] and rule_result["score"] >= 0.5:
        return {
            **rule_result,
            "needs_review": False,
            "confidence": "high",
            "llm_reasoning": None,
            "why_it_matters": _generate_rule_explanation(rule_result),
        }

    # ── Phase 2: LLM analysis for ambiguous / novel changes ──
    if use_llm and os.environ.get("ANTHROPIC_API_KEY"):
        llm_result = _analyze_with_claude(db, company_id, change, raw_doc)
        if llm_result:
            combined_score = max(rule_result["score"], llm_result["score"])
            llm_confidence = llm_result.get("confidence", "low")

            # LLM is confident it's relevant
            if combined_score >= 0.5 and llm_confidence in ("high", "medium"):
                return {
                    "relevant": True,
                    "needs_review": False,
                    "confidence": llm_confidence,
                    "score": combined_score,
                    "urgency": llm_result["urgency"],
                    "matched_rules": rule_result["matched_rules"],
                    "llm_reasoning": llm_result["reasoning"],
                    "why_it_matters": llm_result["why_it_matters"],
                }

            # LLM is confident it's NOT relevant
            if combined_score < 0.2 and llm_confidence == "high":
                return {
                    "relevant": False,
                    "needs_review": False,
                    "confidence": "high",
                    "score": combined_score,
                    "urgency": "LOW",
                    "matched_rules": rule_result["matched_rules"],
                    "llm_reasoning": llm_result["reasoning"],
                    "why_it_matters": "",
                }

            # D17: LLM is unsure → ALWAYS surface for human review.
            # Never silently discard something ambiguous.
            return {
                "relevant": True,  # Treat as relevant so it shows up
                "needs_review": True,
                "confidence": "low",
                "score": combined_score,
                "urgency": llm_result.get("urgency", "MEDIUM"),
                "matched_rules": rule_result["matched_rules"],
                "llm_reasoning": llm_result.get("reasoning", "Ambiguous match — flagged for manual review"),
                "why_it_matters": llm_result.get("why_it_matters", "This change could not be confidently classified. Please review manually."),
            }

    # ── Fallback: No LLM available ──
    # Weak rule match (0 < score < 0.5) → flag for review (D17)
    if rule_result["score"] > 0 and rule_result["score"] < 0.5:
        return {
            **rule_result,
            "relevant": True,
            "needs_review": True,
            "confidence": "low",
            "llm_reasoning": None,
            "why_it_matters": _generate_rule_explanation(rule_result) + " (Low confidence — please verify manually.)",
        }

    # No rules matched at all → not relevant
    return {
        **rule_result,
        "needs_review": False,
        "confidence": "high",
        "llm_reasoning": None,
        "why_it_matters": "",
    }


def _analyze_with_claude(db: Client, company_id: str, change: dict, raw_doc: dict) -> dict | None:
    """Use Claude to analyze whether a regulatory change is relevant.

    Builds a structured prompt with the company's full context (products,
    suppliers, settings) and the change details, then asks Claude to return
    a JSON assessment.  Returns None on any failure so the caller can
    gracefully fall back to rule-only results.
    """
    try:
        import anthropic

        # ── Load the company's full context for the prompt ──
        # We fetch more detail than rules.py does (e.g. product names,
        # settings) because the LLM can use richer context to make
        # nuanced relevance judgments.
        company = db.table("companies").select("name, settings_json").eq("id", company_id).execute().data[0]
        products = db.table("products").select("name, species, origin, simp_covered").eq("company_id", company_id).execute().data
        suppliers = db.table("suppliers").select("name, country").eq("company_id", company_id).execute().data

        # Format company context as a human-readable block for the prompt.
        company_context = f"""Company: {company['name']}
Products: {json.dumps(products, indent=2)}
Suppliers: {json.dumps(suppliers, indent=2)}
Settings: {json.dumps(company.get('settings_json', {}), indent=2)}"""

        # ── Build the change description for the prompt ──
        # Truncate raw_content to 3000 chars to stay well within token
        # limits (max_tokens=500 for the response, but the prompt itself
        # can be much larger -- we want to keep total cost low).
        content = raw_doc.get("raw_content", "")[:3000]
        meta = raw_doc.get("metadata_json", {})
        if isinstance(meta, str):
            meta = json.loads(meta)

        change_text = f"""Change type: {change.get('change_type', 'new')}
Source: {raw_doc.get('source_id', 'unknown')}
Diff/Summary: {change.get('diff_summary', 'N/A')}
Metadata: {json.dumps(meta, indent=2)}
Content (truncated): {content}"""

        # ── Call Claude ──
        # Prompt structure:
        #   - System-level role: "seafood import compliance analyst"
        #   - Two clearly labeled sections: COMPANY CONTEXT and REGULATORY CHANGE
        #   - Strict JSON-only response format so we can parse deterministically
        # We use claude-sonnet for the best balance of quality vs. cost/speed.
        client = anthropic.Anthropic()
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,  # Short response -- just structured JSON
            messages=[{
                "role": "user",
                "content": f"""You are a seafood import compliance analyst. Analyze whether this regulatory change is relevant to the company below.

COMPANY CONTEXT:
{company_context}

REGULATORY CHANGE:
{change_text}

IMPORTANT: If you are unsure whether this change is relevant, you MUST say so.
Do NOT guess. A missed regulatory change on a large shipment can cost thousands
of dollars. When in doubt, set confidence to "low" so it gets flagged for human review.

Respond in JSON format only:
{{
    "relevant": true/false,
    "score": 0.0-1.0,
    "confidence": "high" or "medium" or "low",
    "urgency": "HIGH" or "MEDIUM" or "LOW",
    "reasoning": "brief explanation of why this is or isn't relevant. If unsure, explain what information you'd need to be certain.",
    "why_it_matters": "1-2 sentence plain English explanation for the compliance team. If unsure, say what they should check."
}}"""
            }],
        )

        # Parse the JSON response.  Claude sometimes wraps JSON in markdown
        # code fences, but json.loads handles the clean case.  If parsing
        # fails, the except block catches it and we return None.
        response_text = message.content[0].text
        result = json.loads(response_text)
        return result

    except Exception as e:
        # Catch-all: network errors, auth failures, JSON parse errors, etc.
        # We log and return None so the pipeline continues with rule-only results.
        print(f"  LLM analysis failed: {e}")
        return None


def _generate_rule_explanation(rule_result: dict) -> str:
    """Generate a human-readable explanation from matched rules.

    Translates machine-readable rule tags like "species:atlantic cod" into
    plain English sentences like "This change involves atlantic cod (in your
    product catalog)."  This string is stored as ``why_it_matters`` on the
    alert and shown directly to compliance team members in the UI.
    """
    rules = rule_result.get("matched_rules", [])
    if not rules:
        return ""

    parts = []
    for rule in rules:
        # Each rule is formatted as "kind:value" (e.g. "species:atlantic cod").
        kind, value = rule.split(":", 1)
        if kind == "species":
            parts.append(f"involves {value} (in your product catalog)")
        elif kind == "country":
            parts.append(f"relates to {value} (your supply chain)")
        elif kind == "supplier":
            parts.append(f"mentions supplier {value}")
        elif kind == "regulation":
            parts.append(f"involves {value} regulation")

    return "This change " + ", ".join(parts) + "."
