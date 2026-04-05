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

    API_URL = "https://api.fda.gov/food/enforcement.json"
    SEARCH_TERMS = ["seafood", "fish", "shrimp", "salmon", "cod", "tuna",
                    "crab", "lobster", "oyster", "shellfish", "squid"]

    def fetch(self) -> list[dict]:
        search_query = " OR ".join(f'product_description:"{t}"' for t in self.SEARCH_TERMS)

        response = httpx.get(self.API_URL, params={
            "search": search_query,
            "limit": 100,
            "sort": "report_date:desc",
        }, timeout=30)
        response.raise_for_status()
        data = response.json()

        records = []
        for r in data.get("results", []):
            records.append({
                "external_id": r.get("recall_number"),
                "raw_content": json.dumps(r),
                "metadata_json": {
                    "product_description": r.get("product_description", "")[:200],
                    "reason_for_recall": r.get("reason_for_recall", "")[:200],
                    "report_date": r.get("report_date"),
                    "classification": r.get("classification"),
                    "status": r.get("status"),
                    "recalling_firm": r.get("recalling_firm"),
                    "city": r.get("city"),
                    "state": r.get("state"),
                    "country": r.get("country"),
                },
            })

        return records
