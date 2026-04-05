import httpx
from bs4 import BeautifulSoup

from ingestion.base import BaseIngester


class NOAAMMPAIngester(BaseIngester):
    """Monitor NOAA MMPA Import Provisions pages.

    Tracks the Marine Mammal Protection Act bycatch criteria and
    comparability finding determinations that affect seafood imports.
    """

    source_name = "NOAA MMPA Import Provisions"
    source_id = "noaa_mmpa"

    PAGES = [
        {
            "url": "https://www.fisheries.noaa.gov/content/noaa-fisheries-establishes-international-marine-mammal-bycatch-criteria-us-imports",
            "label": "MMPA Bycatch Criteria for US Imports",
        },
        {
            "url": "https://www.fisheries.noaa.gov/international-affairs/2025-marine-mammal-protection-act-comparability-finding-determinations",
            "label": "MMPA 2025 Comparability Findings",
        },
    ]

    def fetch(self) -> list[dict]:
        records = []
        for page in self.PAGES:
            try:
                response = httpx.get(page["url"], timeout=30, follow_redirects=True)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, "lxml")
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
