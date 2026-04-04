import json

import httpx
from bs4 import BeautifulSoup

from ingestion.base import BaseIngester


class FDAImportAlertsIngester(BaseIngester):
    """Scrape FDA Import Alert pages for seafood-related alerts.

    Main page: https://www.fda.gov/industry/actions-enforcement/import-alerts
    Individual alerts link to detail pages with firm lists, charges, and countries.
    """

    source_name = "FDA Import Alerts"
    source_id = "fda_import_alerts"

    BASE_URL = "https://www.fda.gov"
    INDEX_URL = "https://www.fda.gov/industry/import-alerts/import-alert-16"
    # Import Alert 16-xx covers fishery/seafood products

    SEAFOOD_ALERT_PREFIXES = ["16-"]

    def fetch(self) -> list[dict]:
        records = []

        # Fetch the main Import Alert 16 index (fishery/seafood)
        response = httpx.get(self.INDEX_URL, timeout=30, follow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # Find alert links on the page
        alert_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/import-alert/" in href and any(p in a.get_text() for p in self.SEAFOOD_ALERT_PREFIXES):
                full_url = href if href.startswith("http") else f"{self.BASE_URL}{href}"
                alert_links.append({
                    "url": full_url,
                    "title": a.get_text(strip=True),
                })

        # Fetch each alert detail page
        for link in alert_links[:20]:  # Limit to avoid overwhelming FDA servers
            try:
                detail_resp = httpx.get(link["url"], timeout=30, follow_redirects=True)
                detail_resp.raise_for_status()

                records.append({
                    "external_id": link["url"],
                    "raw_content": detail_resp.text,
                    "metadata_json": {
                        "title": link["title"],
                        "url": link["url"],
                        "source_page": self.INDEX_URL,
                    },
                })
            except httpx.HTTPError:
                continue  # Skip failed individual pages, don't fail the whole run

        return records
