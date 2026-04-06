"""USDA FSIS (Food Safety and Inspection Service) recalls page monitor.

Source: USDA FSIS Recalls & Public Health Alerts page (HTML scraping)

Why it matters for seafood compliance:
    FSIS is the USDA agency responsible for food safety of meat, poultry, and
    processed egg products -- but its jurisdiction overlaps with seafood in
    important ways. Catfish and catfish products are regulated by FSIS (not
    FDA) under the 2014 Farm Bill. Additionally, combination products that
    contain both meat/poultry and seafood (e.g., seafood-stuffed chicken) fall
    under FSIS jurisdiction. FSIS recalls also provide signal about shared
    supply chain risks: a facility recalling poultry products may also process
    seafood, and pathogen contamination events can span product lines.

How the data is fetched:
    We scrape the FSIS recalls page because USDA does not provide a public API
    for recall data. The page uses a teaser-card layout where each recall is
    rendered as a "recall-teaser__grid" div. We extract the full page text for
    change detection and count the teaser elements to track the number of
    active recalls.

    IMPORTANT: The FSIS website blocks requests without a browser-like
    User-Agent header, returning 403 Forbidden. We must send a realistic
    User-Agent string to avoid being rejected.
"""

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

    # A browser-like User-Agent is required. Without it, the FSIS web server
    # returns HTTP 403 Forbidden because it blocks non-browser clients
    # (likely a WAF/bot-protection rule). This is a common pattern on
    # government sites that use Drupal or Akamai CDN.
    HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}

    def fetch(self) -> list[dict]:
        response = httpx.get(self.URL, headers=self.HEADERS, timeout=30, follow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")
        # Narrow to <main> to exclude header/footer/nav boilerplate.
        main = soup.find("main") or soup
        content = main.get_text(separator="\n", strip=True)

        # Each recall on the FSIS page is rendered as a teaser card inside a
        # div with class "recall-teaser__grid". These teasers contain the
        # recall headline, date, reason, and classification. Counting them
        # gives us a quick metric for how many active recalls are displayed --
        # a change in this count between runs is a strong signal that a new
        # recall was posted or an old one was removed.
        teasers = soup.find_all("div", class_="recall-teaser__grid")

        return [{
            "external_id": self.URL,
            "raw_content": content,
            "metadata_json": {
                "url": self.URL,
                "label": "USDA FSIS Recalls & Public Health Alerts",
                "html_length": len(response.text),
                # Number of recall teaser cards found on the page.
                # Useful for quick change detection without full-text diffing.
                "recall_count": len(teasers),
            },
        }]
