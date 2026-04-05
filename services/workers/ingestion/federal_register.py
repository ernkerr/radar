import json

import httpx

from ingestion.base import BaseIngester
from config import settings


class FederalRegisterIngester(BaseIngester):
    """Ingest seafood-related documents from the Federal Register API.

    API docs: https://www.federalregister.gov/developers/documentation/api/v1
    No authentication required. Rate limit: be respectful (< 1 req/sec).
    """

    source_name = "Federal Register"
    source_id = "federal_register"

    # Agencies relevant to seafood compliance
    AGENCIES = ["food-and-drug-administration", "national-oceanic-and-atmospheric-administration",
                "customs-and-border-protection", "agriculture-department"]

    # Keywords to filter for seafood relevance
    KEYWORDS = ["seafood", "fish", "import", "HACCP", "SIMP", "aquaculture",
                "shellfish", "crustacean", "shrimp", "salmon", "cod", "tuna"]

    def fetch(self) -> list[dict]:
        records = []

        for keyword in self.KEYWORDS:
            url = f"{settings.federal_register_base_url}/documents.json"
            params = [
                ("per_page", "20"),
                ("order", "newest"),
                ("conditions[term]", keyword),
            ]
            for field in ["document_number", "title", "type", "abstract",
                          "publication_date", "agencies", "html_url"]:
                params.append(("fields[]", field))

            response = httpx.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            for doc in data.get("results", []):
                records.append({
                    "external_id": doc.get("document_number"),
                    "raw_content": json.dumps(doc),
                    "metadata_json": {
                        "title": doc.get("title"),
                        "type": doc.get("type"),
                        "publication_date": doc.get("publication_date"),
                        "agencies": [a.get("name") for a in doc.get("agencies", [])],
                        "html_url": doc.get("html_url"),
                        "keyword_match": keyword,
                    },
                })

        # Deduplicate by document_number
        seen = set()
        unique = []
        for r in records:
            if r["external_id"] not in seen:
                seen.add(r["external_id"])
                unique.append(r)

        return unique
