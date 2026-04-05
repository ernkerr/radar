import httpx
from bs4 import BeautifulSoup

from ingestion.base import BaseIngester


class USDAFSISIngester(BaseIngester):
    """Monitor USDA FSIS Recalls & Public Health Alerts page.

    Page: https://www.fsis.usda.gov/recalls
    Requires User-Agent header. No API available.
    Covers meat, poultry, and egg product recalls (includes seafood).
    """

    source_name = "USDA FSIS Recalls"
    source_id = "usda_fsis"

    URL = "https://www.fsis.usda.gov/recalls"
    HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}

    def fetch(self) -> list[dict]:
        response = httpx.get(self.URL, headers=self.HEADERS, timeout=30, follow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")
        main = soup.find("main") or soup
        content = main.get_text(separator="\n", strip=True)

        teasers = soup.find_all("div", class_="recall-teaser__grid")

        return [{
            "external_id": self.URL,
            "raw_content": content,
            "metadata_json": {
                "url": self.URL,
                "label": "USDA FSIS Recalls & Public Health Alerts",
                "html_length": len(response.text),
                "recall_count": len(teasers),
            },
        }]
