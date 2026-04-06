"""FDA Food Enforcement API ingester for seafood-related recalls and alerts.

Source: openFDA food/enforcement API (https://open.fda.gov/apis/food/enforcement/)

Why it matters for seafood compliance:
    The FDA food enforcement endpoint is the authoritative federal source for
    food recalls, market withdrawals, and safety alerts. Seafood products are
    subject to FDA jurisdiction (unlike meat/poultry which fall under USDA), so
    this endpoint captures the majority of seafood-specific enforcement actions
    -- including recalls triggered by undeclared allergens, pathogen
    contamination (Listeria, Salmonella), misbranding, and import violations.

How the data is fetched:
    We query the public openFDA REST API (no API key required, though rate
    limits apply). The search is filtered to seafood-related products by
    OR-joining a set of species/category keywords against the
    product_description field. Results are sorted newest-first and capped at
    100 per request.
"""

import json

import httpx

from ingestion.base import BaseIngester


class FDAImportAlertsIngester(BaseIngester):
    """Ingest seafood-related enforcement actions from the openFDA API.

    API docs: https://open.fda.gov/apis/food/enforcement/
    No authentication required. Returns recalls, market withdrawals,
    and safety alerts related to seafood products.
    """

    source_name = "FDA Import Alerts"
    source_id = "fda_import_alerts"

    # The enforcement endpoint returns JSON records for each enforcement event
    # (Class I/II/III recalls, market withdrawals, safety alerts).
    API_URL = "https://api.fda.gov/food/enforcement.json"

    # Broad set of seafood keywords so we capture species-specific recalls
    # (e.g. "salmon" for a smoked salmon Listeria recall) as well as generic
    # category terms ("seafood", "shellfish"). This list intentionally casts a
    # wide net -- downstream classifiers handle relevance scoring.
    SEARCH_TERMS = ["seafood", "fish", "shrimp", "salmon", "cod", "tuna",
                    "crab", "lobster", "oyster", "shellfish", "squid"]

    def fetch(self) -> list[dict]:
        # Build an OR-joined openFDA search query. Each term is quoted and
        # scoped to the product_description field, producing a query like:
        #   product_description:"seafood" OR product_description:"fish" OR ...
        # The openFDA query syntax uses Lucene-style field:value pairs.
        search_query = " OR ".join(f'product_description:"{t}"' for t in self.SEARCH_TERMS)

        response = httpx.get(self.API_URL, params={
            "search": search_query,
            "limit": 100,              # openFDA max per request is 100
            "sort": "report_date:desc",  # newest enforcement actions first
        }, timeout=30)
        response.raise_for_status()
        data = response.json()

        records = []
        for r in data.get("results", []):
            records.append({
                # recall_number is the FDA's unique identifier for this action
                # (e.g. "F-1234-2025"). Used for deduplication across runs.
                "external_id": r.get("recall_number"),

                # Store the full API response object so downstream processors
                # can extract any field, even ones we don't put in metadata.
                "raw_content": json.dumps(r),

                # Structured metadata fields for quick filtering and display.
                "metadata_json": {
                    # Truncated to 200 chars to keep metadata compact; the
                    # full text is available in raw_content.
                    "product_description": r.get("product_description", "")[:200],
                    "reason_for_recall": r.get("reason_for_recall", "")[:200],
                    # report_date is when FDA published the enforcement report
                    "report_date": r.get("report_date"),
                    # classification: "Class I" (most serious, potential health
                    # consequences), "Class II" (temporary/reversible), or
                    # "Class III" (unlikely to cause adverse health consequences)
                    "classification": r.get("classification"),
                    # status: "Ongoing", "Completed", or "Terminated"
                    "status": r.get("status"),
                    # Firm and location info for geographic risk analysis
                    "recalling_firm": r.get("recalling_firm"),
                    "city": r.get("city"),
                    "state": r.get("state"),
                    "country": r.get("country"),
                },
            })

        return records
