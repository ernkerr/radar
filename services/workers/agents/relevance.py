"""Hybrid relevance engine (D5).

1. Rule-based matching runs first (fast, deterministic)
2. If rules don't match but the change looks significant, Claude analyzes it
3. Returns combined relevance score, reasoning, and urgency
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
    """Analyze a change's relevance to a company.

    Returns:
        {
            "relevant": bool,
            "score": float,
            "urgency": "HIGH" | "MEDIUM" | "LOW",
            "matched_rules": [...],
            "llm_reasoning": str | None,
            "why_it_matters": str,
        }
    """
    # Step 1: Rule-based matching
    rule_result = match_rules(db, company_id, change, raw_doc)

    if rule_result["relevant"] and rule_result["score"] >= 0.5:
        # Strong rule match — no need for LLM
        return {
            **rule_result,
            "llm_reasoning": None,
            "why_it_matters": _generate_rule_explanation(rule_result),
        }

    # Step 2: LLM analysis for ambiguous or novel changes
    if use_llm and os.environ.get("ANTHROPIC_API_KEY"):
        llm_result = _analyze_with_claude(db, company_id, change, raw_doc)
        if llm_result:
            # Merge rule and LLM results
            combined_score = max(rule_result["score"], llm_result["score"])
            return {
                "relevant": combined_score > 0.2,
                "score": combined_score,
                "urgency": llm_result["urgency"] if llm_result["score"] > rule_result["score"] else rule_result["urgency"],
                "matched_rules": rule_result["matched_rules"],
                "llm_reasoning": llm_result["reasoning"],
                "why_it_matters": llm_result["why_it_matters"],
            }

    # Fallback: return rule result only
    return {
        **rule_result,
        "llm_reasoning": None,
        "why_it_matters": _generate_rule_explanation(rule_result) if rule_result["relevant"] else "",
    }


def _analyze_with_claude(db: Client, company_id: str, change: dict, raw_doc: dict) -> dict | None:
    """Use Claude to analyze whether a regulatory change is relevant."""
    try:
        import anthropic

        # Load company context
        company = db.table("companies").select("name, settings_json").eq("id", company_id).execute().data[0]
        products = db.table("products").select("name, species, origin, simp_covered").eq("company_id", company_id).execute().data
        suppliers = db.table("suppliers").select("name, country").eq("company_id", company_id).execute().data

        company_context = f"""Company: {company['name']}
Products: {json.dumps(products, indent=2)}
Suppliers: {json.dumps(suppliers, indent=2)}
Settings: {json.dumps(company.get('settings_json', {}), indent=2)}"""

        # Get document content (truncated)
        content = raw_doc.get("raw_content", "")[:3000]
        meta = raw_doc.get("metadata_json", {})
        if isinstance(meta, str):
            meta = json.loads(meta)

        change_text = f"""Change type: {change.get('change_type', 'new')}
Source: {raw_doc.get('source_id', 'unknown')}
Diff/Summary: {change.get('diff_summary', 'N/A')}
Metadata: {json.dumps(meta, indent=2)}
Content (truncated): {content}"""

        client = anthropic.Anthropic()
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""You are a seafood import compliance analyst. Analyze whether this regulatory change is relevant to the company below.

COMPANY CONTEXT:
{company_context}

REGULATORY CHANGE:
{change_text}

Respond in JSON format only:
{{
    "relevant": true/false,
    "score": 0.0-1.0,
    "urgency": "HIGH" or "MEDIUM" or "LOW",
    "reasoning": "brief explanation of why this is or isn't relevant",
    "why_it_matters": "1-2 sentence plain English explanation for the compliance team"
}}"""
            }],
        )

        response_text = message.content[0].text
        # Extract JSON from response
        result = json.loads(response_text)
        return result

    except Exception as e:
        print(f"  LLM analysis failed: {e}")
        return None


def _generate_rule_explanation(rule_result: dict) -> str:
    """Generate a human-readable explanation from matched rules."""
    rules = rule_result.get("matched_rules", [])
    if not rules:
        return ""

    parts = []
    for rule in rules:
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
