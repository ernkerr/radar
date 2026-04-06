"""Deterministic rule-based relevance matching (D5).

Checks if a detected change is relevant to a company based on their
configured products (species, origins) and suppliers (countries).

Returns matched rules and a relevance score (0.0-1.0).
"""

import json
import re

from supabase import Client


def match_rules(db: Client, company_id: str, change: dict, raw_doc: dict) -> dict:
    """Check a change against a company's context and return matches.

    Returns:
        {
            "relevant": bool,
            "score": float (0.0-1.0),
            "matched_rules": ["species:Atlantic Cod", "country:Iceland", ...],
            "urgency": "HIGH" | "MEDIUM" | "LOW",
        }
    """
    # Load company context
    products = db.table("products").select("species, origin, simp_covered").eq("company_id", company_id).execute().data
    suppliers = db.table("suppliers").select("name, country").eq("company_id", company_id).execute().data

    # Build lookup sets
    species_set = {p["species"].lower() for p in products if p.get("species")}
    origin_set = {p["origin"].lower() for p in products if p.get("origin")}
    supplier_countries = {s["country"].lower() for s in suppliers if s.get("country")}
    supplier_names = {s["name"].lower() for s in suppliers if s.get("name")}
    simp_species = {p["species"].lower() for p in products if p.get("simp_covered")}

    # Get searchable text from the change
    text = _get_searchable_text(change, raw_doc).lower()

    matched_rules = []
    score = 0.0

    # Rule 1: Species match
    for species in species_set:
        if species in text:
            matched_rules.append(f"species:{species}")
            score += 0.3

    # Rule 2: Country/origin match
    for country in origin_set | supplier_countries:
        if country in text:
            matched_rules.append(f"country:{country}")
            score += 0.2

    # Rule 3: Supplier name match
    for name in supplier_names:
        if name in text:
            matched_rules.append(f"supplier:{name}")
            score += 0.4

    # Rule 4: SIMP-related content for SIMP-covered species
    if simp_species and any(kw in text for kw in ["simp", "seafood import monitoring"]):
        matched_rules.append("regulation:SIMP")
        score += 0.2

    # Rule 5: High-urgency keywords
    urgency = "LOW"
    high_urgency_keywords = ["recall", "banned", "detained", "refused", "violation", "contaminated", "outbreak"]
    medium_urgency_keywords = ["proposed rule", "guidance", "advisory", "warning", "alert"]

    if any(kw in text for kw in high_urgency_keywords):
        urgency = "HIGH"
        score += 0.1
    elif any(kw in text for kw in medium_urgency_keywords):
        urgency = "MEDIUM"

    # Cap score at 1.0
    score = min(score, 1.0)

    return {
        "relevant": len(matched_rules) > 0,
        "score": round(score, 2),
        "matched_rules": matched_rules,
        "urgency": urgency,
    }


def _get_searchable_text(change: dict, raw_doc: dict) -> str:
    """Extract all searchable text from a change and its raw document."""
    parts = []

    # Diff summary
    if change.get("diff_summary"):
        parts.append(change["diff_summary"])

    # Raw content
    content = raw_doc.get("raw_content", "")
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            # Flatten JSON values into searchable text
            parts.extend(str(v) for v in parsed.values() if isinstance(v, str))
        else:
            parts.append(str(parsed))
    except (json.JSONDecodeError, TypeError):
        parts.append(content[:5000])

    # Metadata
    meta = raw_doc.get("metadata_json", {})
    if isinstance(meta, str):
        meta = json.loads(meta)
    for v in meta.values():
        if isinstance(v, str):
            parts.append(v)

    return " ".join(parts)
