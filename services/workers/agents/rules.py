"""Deterministic rule-based relevance matching (D5).

Checks if a detected change is relevant to a company based on their
configured products (species, origins) and suppliers (countries).

Returns matched rules and a relevance score (0.0-1.0).

This is the "fast path" of the hybrid relevance engine.  Every change goes
through these rules first.  Only when the rules are inconclusive does the
system escalate to the LLM path (see relevance.py).  Keeping rules
deterministic means results are reproducible, auditable, and free -- no API
calls required.

Scoring weights rationale (why these numbers):
    - 0.4  supplier name  -- Highest weight because a direct supplier mention
           almost certainly affects the company's supply chain.
    - 0.3  species        -- Strong signal; species is the primary product
           dimension for seafood importers.
    - 0.2  country/origin -- Useful but broader; many documents mention a
           country without being operationally relevant.
    - 0.2  SIMP regulation -- Important for compliance but only fires when
           the company has SIMP-covered species, so slightly lower.
    - 0.1  urgency keywords -- Small bump; these keywords indicate severity
           but don't by themselves prove relevance to *this* company.
    Scores are additive and capped at 1.0.  A score >= 0.5 is treated as a
    "strong match" by the relevance engine and skips the LLM entirely.
"""

import json
import re

from supabase import Client


def match_rules(db: Client, company_id: str, change: dict, raw_doc: dict) -> dict:
    """Check a change against a company's context and return matches.

    Loads the company's product catalog and supplier list from the database,
    then runs five deterministic rules against the change's text content.
    Each rule that fires adds to the cumulative score and records itself in
    ``matched_rules`` (e.g. "species:atlantic cod").

    Returns:
        {
            "relevant": bool,       -- True if at least one rule matched
            "score": float (0.0-1.0),
            "matched_rules": ["species:Atlantic Cod", "country:Iceland", ...],
            "urgency": "HIGH" | "MEDIUM" | "LOW",
        }
    """
    # ── Load company context from the database ──
    # Products define what the company imports (species + country of origin).
    # Suppliers define who they buy from (supplier name + country).
    # These two tables are the core "profile" that rules match against.
    products = db.table("products").select("species, origin, simp_covered").eq("company_id", company_id).execute().data
    suppliers = db.table("suppliers").select("name, country").eq("company_id", company_id).execute().data

    # ── Build lowercase lookup sets for case-insensitive matching ──
    # Using sets for O(1) membership checks when iterating rules.
    species_set = {p["species"].lower() for p in products if p.get("species")}
    origin_set = {p["origin"].lower() for p in products if p.get("origin")}
    supplier_countries = {s["country"].lower() for s in suppliers if s.get("country")}
    supplier_names = {s["name"].lower() for s in suppliers if s.get("name")}
    # simp_species: subset of species that are covered by the Seafood Import
    # Monitoring Program -- triggers Rule 4 when SIMP keywords appear.
    simp_species = {p["species"].lower() for p in products if p.get("simp_covered")}

    # Flatten the change + raw document into a single searchable string.
    # This lets every rule do a simple substring search rather than
    # navigating nested JSON structures.
    text = _get_searchable_text(change, raw_doc).lower()

    matched_rules = []
    score = 0.0

    # ── Rule 1: Species match (weight 0.3 per species) ──
    # Checks if any of the company's tracked species names appear anywhere
    # in the document text.  Weight is 0.3 because a species mention is a
    # strong (but not conclusive) signal of relevance.
    for species in species_set:
        if species in text:
            matched_rules.append(f"species:{species}")
            score += 0.3

    # ── Rule 2: Country / origin match (weight 0.2 per country) ──
    # Merges product origins and supplier countries into one set, then
    # checks for mentions.  Weight is 0.2 because country names are common
    # in regulatory text and may appear in unrelated contexts.
    for country in origin_set | supplier_countries:
        if country in text:
            matched_rules.append(f"country:{country}")
            score += 0.2

    # ── Rule 3: Supplier name match (weight 0.4 per supplier) ──
    # Highest weight -- if a regulatory document names one of the company's
    # actual suppliers, it is almost certainly relevant (e.g. an import
    # refusal for that supplier's shipment).
    for name in supplier_names:
        if name in text:
            matched_rules.append(f"supplier:{name}")
            score += 0.4

    # ── Rule 4: SIMP regulation match (weight 0.2) ──
    # Only fires if the company has at least one SIMP-covered species AND
    # the document mentions SIMP.  This avoids false positives for companies
    # that don't deal with SIMP-regulated products.
    if simp_species and any(kw in text for kw in ["simp", "seafood import monitoring"]):
        matched_rules.append("regulation:SIMP")
        score += 0.2

    # ── Rule 5: Urgency keyword detection (weight 0.1 for HIGH only) ──
    # Scans for enforcement/safety keywords to set the urgency level.
    # HIGH keywords suggest immediate action (recalls, bans, contamination).
    # MEDIUM keywords suggest upcoming or advisory changes.
    # Note: urgency keywords alone add only 0.1 to the score -- they boost
    # relevance slightly but don't make a change "relevant" on their own
    # (a recall in an unrelated industry is still irrelevant to this company).
    urgency = "LOW"
    high_urgency_keywords = ["recall", "banned", "detained", "refused", "violation", "contaminated", "outbreak"]
    medium_urgency_keywords = ["proposed rule", "guidance", "advisory", "warning", "alert"]

    if any(kw in text for kw in high_urgency_keywords):
        urgency = "HIGH"
        score += 0.1  # Small bump -- urgency alone does not imply relevance
    elif any(kw in text for kw in medium_urgency_keywords):
        urgency = "MEDIUM"
        # No score bump for medium -- these keywords are informational

    # Scores are additive across rules, so cap at 1.0 maximum.
    score = min(score, 1.0)

    return {
        "relevant": len(matched_rules) > 0,  # At least one rule must fire
        "score": round(score, 2),
        "matched_rules": matched_rules,
        "urgency": urgency,
    }


def _get_searchable_text(change: dict, raw_doc: dict) -> str:
    """Extract all searchable text from a change and its raw document.

    Combines three text sources into a single space-joined string:
      1. diff_summary -- the human-readable diff from the detection layer.
      2. raw_content  -- the full document body (JSON values are flattened
         into strings; non-JSON content is truncated to 5000 chars to
         avoid excessive memory usage on huge HTML pages).
      3. metadata_json -- structured fields like title, type, date, etc.

    The caller lowercases the result before matching, so casing is
    preserved here for potential future use in other contexts.
    """
    parts = []

    # Include the diff summary so rules can match on what specifically changed,
    # not just the full document.
    if change.get("diff_summary"):
        parts.append(change["diff_summary"])

    # Include the raw document content.
    content = raw_doc.get("raw_content", "")
    try:
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            # For JSON objects, extract just the string values (skip numeric
            # IDs, booleans, etc. that would add noise to text matching).
            parts.extend(str(v) for v in parsed.values() if isinstance(v, str))
        else:
            parts.append(str(parsed))
    except (json.JSONDecodeError, TypeError):
        # Non-JSON content (HTML, plain text) -- truncate to avoid
        # blowing up memory on very large pages.
        parts.append(content[:5000])

    # Include metadata fields (title, type, publication_date, etc.).
    # These often contain the most informative text for rule matching.
    meta = raw_doc.get("metadata_json", {})
    if isinstance(meta, str):
        meta = json.loads(meta)
    for v in meta.values():
        if isinstance(v, str):
            parts.append(v)

    return " ".join(parts)
