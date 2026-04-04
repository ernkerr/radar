import json

import httpx
from bs4 import BeautifulSoup

from ingestion.base import BaseIngester


class NOAASIMPIngester(BaseIngester):
    """Monitor NOAA Seafood Import Monitoring Program pages.

    Tracks changes to the SIMP species list, reporting requirements,
    and enforcement updates.
    """

    source_name = "NOAA SIMP"
    source_id = "noaa_simp"

    PAGES = [
        {
            "url": "https://www.fisheries.noaa.gov/international/international-affairs/seafood-import-monitoring-program",
            "label": "SIMP Main Page",
        },
        {
            "url": "https://www.fisheries.noaa.gov/international/international-affairs/simp-species-list",
            "label": "SIMP Species List",
        },
    ]

    def fetch(self) -> list[dict]:
        records = []

        for page in self.PAGES:
            try:
                response = httpx.get(page["url"], timeout=30, follow_redirects=True)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, "lxml")
                # Extract main content area to reduce noise
                main = soup.find("main") or soup.find("article") or soup
                content = main.get_text(separator="\n", strip=True)

                records.append({
                    "external_id": page["url"],
                    "raw_content": content,
                    "metadata_json": {
                        "label": page["label"],
                        "url": page["url"],
                        "html_length": len(response.text),
                    },
                })
            except httpx.HTTPError:
                continue

        return records
