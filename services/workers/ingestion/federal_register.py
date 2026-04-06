"""
Federal Register ingester — fetches regulatory documents via REST API.

The Federal Register is the official journal of the US federal government.
It publishes proposed rules, final rules, notices, and executive orders
from agencies like FDA, NOAA, and CBP.

This ingester searches for seafood-related documents using keyword queries.
Each keyword gets its own API call (the API doesn't support OR queries well),
then results are deduplicated by document_number.

API docs: https://www.federalregister.gov/developers/documentation/api/v1
No authentication required.
"""

import json

import httpx

from ingestion.base import BaseIngester
from config import settings


class FederalRegisterIngester(BaseIngester):

    source_name = "Federal Register"
    source_id = "federal_register"  # Must match the id in the sources table

    # Keywords to search for — each becomes a separate API call.
    # Broad terms like "fish" and "import" cast a wide net;
    # specific terms like "HACCP" and "SIMP" catch regulation-specific docs.
    KEYWORDS = ["seafood", "fish", "import", "HACCP", "SIMP", "aquaculture",
                "shellfish", "crustacean", "shrimp", "salmon", "cod", "tuna"]

    def fetch(self) -> list[dict]:
        records = []

        for keyword in self.KEYWORDS:
            url = f"{settings.federal_register_base_url}/documents.json"

            # The Federal Register API uses PHP-style array params (fields[]).
            # httpx needs these as a list of tuples to serialize correctly.
            params = [
                ("per_page", "20"),       # 20 most recent results per keyword
                ("order", "newest"),       # Most recent first
                ("conditions[term]", keyword),
            ]
            # Request only the fields we need (reduces response size)
            for field in ["document_number", "title", "type", "abstract",
                          "publication_date", "agencies", "html_url"]:
                params.append(("fields[]", field))

            response = httpx.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()

            for doc in data.get("results", []):
                records.append({
                    "external_id": doc.get("document_number"),
                    "raw_content": json.dumps(doc),  # Store full JSON for change detection
                    "metadata_json": {
                        "title": doc.get("title"),
                        "type": doc.get("type"),  # "Rule", "Proposed Rule", "Notice", etc.
                        "publication_date": doc.get("publication_date"),
                        "agencies": [a.get("name") for a in doc.get("agencies", [])],
                        "html_url": doc.get("html_url"),
                        "keyword_match": keyword,  # Which keyword matched this doc
                    },
                })

        # A single document can match multiple keywords (e.g., "fish" and "import").
        # Deduplicate by document_number so we only store each document once.
        seen = set()
        unique = []
        for r in records:
            if r["external_id"] not in seen:
                seen.add(r["external_id"])
                unique.append(r)

        return unique
