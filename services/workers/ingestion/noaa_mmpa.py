"""NOAA Marine Mammal Protection Act (MMPA) Import Provisions page monitor.

Source: NOAA Fisheries MMPA import provisions web pages (HTML scraping)

Why it matters for seafood compliance:
    The MMPA Import Provisions Rule (finalized 2016, enforcement phased in)
    requires that nations exporting commercial fish and fish products to the
    U.S. demonstrate that their fisheries have regulatory programs comparable
    to U.S. standards for reducing marine mammal bycatch (incidental capture
    or killing of dolphins, whales, seals, etc. during fishing operations).

    If a foreign fishery fails to receive a "comparability finding" from NOAA,
    fish and fish products from that fishery are banned from U.S. import. This
    can affect entire seafood categories from specific countries overnight.

    Comparability findings are determinations by NOAA that a foreign fishery's
    marine mammal bycatch mitigation programs are comparable in effectiveness
    to U.S. programs. These findings are published (and can be revoked) on the
    pages we monitor. A negative or revoked finding means an immediate import
    prohibition for the affected fishery.

How the data is fetched:
    We monitor two NOAA pages by downloading their HTML and extracting text
    content. There is no structured API for MMPA provisions, so page monitoring
    with change detection is the only viable approach.
"""

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

    # Two pages covering the MMPA import provisions framework:
    #
    # 1. Bycatch Criteria page -- defines the standards foreign fisheries must
    #    meet to export to the U.S. (bycatch limits, observer coverage
    #    requirements, mitigation measures). Changes here signal evolving
    #    regulatory requirements.
    #
    # 2. Comparability Findings page -- the actual determinations for each
    #    country/fishery. This is the actionable page: it lists which fisheries
    #    have been granted, denied, or had revoked their comparability finding.
    #    A new denial or revocation here triggers an immediate import ban.
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
                # follow_redirects=True because NOAA reorganizes URLs and
                # may redirect old paths to updated locations.
                response = httpx.get(page["url"], timeout=30, follow_redirects=True)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, "lxml")
                # Extract just the main content area, excluding navigation,
                # footer, and sidebar elements that add noise to change diffs.
                main = soup.find("main") or soup.find("article") or soup
                content = main.get_text(separator="\n", strip=True)

                records.append({
                    # URL as external_id for stable cross-run deduplication.
                    "external_id": page["url"],
                    "raw_content": content,
                    "metadata_json": {
                        "label": page["label"],
                        "url": page["url"],
                        # Track HTML length as a quick change heuristic.
                        "html_length": len(response.text),
                    },
                })
            except httpx.HTTPError:
                # Skip failed pages rather than aborting the entire ingestion.
                # The other page may still succeed and provide useful data.
                continue
        return records
