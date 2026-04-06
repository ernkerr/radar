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
            "score": float,
            "urgency": "HIGH" | "MEDIUM" | "LOW",
            "matched_rules": [...],
            "llm_reasoning": str | None,
            "why_it_matters": str,
        }
    """
    # ── Phase 1: Deterministic rule matching (always runs) ──
    # Fast, free, and reproducible.  See rules.py for the five rules.
    rule_result = match_rules(db, company_id, change, raw_doc)

    if rule_result["relevant"] and rule_result["score"] >= 0.5:
        # Strong rule match (score >= 0.5 means multiple rules fired or a
        # high-weight rule like supplier matched).  No need to spend money
        # on an LLM call -- we are confident this is relevant.
        return {
            **rule_result,
            "llm_reasoning": None,
            "why_it_matters": _generate_rule_explanation(rule_result),
        }

    # ── Phase 2: LLM analysis for ambiguous / novel changes ──
    # Only invoked when:
    #   1. use_llm flag is True (caller opted in), AND
    #   2. ANTHROPIC_API_KEY is set in the environment.
    # If either condition is false, we skip straight to the fallback.
    if use_llm and os.environ.get("ANTHROPIC_API_KEY"):
        llm_result = _analyze_with_claude(db, company_id, change, raw_doc)
        if llm_result:
            # ── Merge rule and LLM results ──
            # Take the higher of the two scores so that partial rule matches
            # still benefit from LLM confirmation, and vice versa.
            combined_score = max(rule_result["score"], llm_result["score"])
            return {
                # A combined score > 0.2 is the threshold for "relevant".
                # This is intentionally lower than the 0.5 rule-only
                # threshold because the LLM provides semantic understanding
                # that justifies a lower confidence bar.
                "relevant": combined_score > 0.2,
                "score": combined_score,
                # Use the urgency from whichever source had the higher score,
                # since that source had more confidence in its assessment.
                "urgency": llm_result["urgency"] if llm_result["score"] > rule_result["score"] else rule_result["urgency"],
                # Always include rule matches for auditability, even when
                # the LLM drove the final decision.
                "matched_rules": rule_result["matched_rules"],
                "llm_reasoning": llm_result["reasoning"],
                "why_it_matters": llm_result["why_it_matters"],
            }

    # ── Fallback: rule result only ──
    # Reached when: (a) LLM is disabled/unavailable, or (b) the LLM call
    # failed (network error, rate limit, malformed response).
    # We return whatever the rules found.  If no rules matched, the change
    # is marked as not relevant (why_it_matters will be empty).
    return {
        **rule_result,
        "llm_reasoning": None,
        "why_it_matters": _generate_rule_explanation(rule_result) if rule_result["relevant"] else "",
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
