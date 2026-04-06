"""NOAA Seafood Import Monitoring Program (SIMP) page monitor.

Source: NOAA Fisheries SIMP web pages (no API available -- HTML scraping)

Why it matters for seafood compliance:
    SIMP requires importers of certain at-risk seafood species to report
    catch/harvest data at the point of entry into U.S. commerce. The program
    targets species vulnerable to IUU (illegal, unreported, unregulated)
    fishing and seafood fraud. Changes to the SIMP species list, reporting
    forms, or compliance guidance directly affect importer obligations and
    can trigger enforcement actions if missed.

How the data is fetched:
    We monitor three key NOAA SIMP pages by downloading their HTML and
    extracting the text content with BeautifulSoup. Each page is stored as a
    separate record so downstream change-detection can identify which page
    changed. Since NOAA has no structured API for SIMP content, page
    monitoring is the only reliable approach.
"""

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

    # We monitor 3 distinct pages because SIMP information is spread across
    # them and each serves a different compliance purpose:
    #
    # 1. Main Page -- the authoritative overview of SIMP requirements,
    #    including the list of species subject to SIMP and general program
    #    guidance. Changes here may signal new species additions or
    #    requirement updates.
    #
    # 2. Essential Forms and Documents -- contains the actual forms importers
    #    must use (e.g., ACE filing guidance, International Fisheries Trade
    #    Permit application). Form revisions require immediate action.
    #
    # 3. Facts and Reports -- enforcement statistics, compliance reports, and
    #    program updates. Useful for tracking NOAA's enforcement posture and
    #    identifying compliance trends.
    PAGES = [
        {
            "url": "https://www.fisheries.noaa.gov/international/international-affairs/seafood-import-monitoring-program",
            "label": "SIMP Main Page",
        },
        {
            "url": "https://www.fisheries.noaa.gov/international/international-affairs/seafood-import-monitoring-program-essential-forms-and-documents",
            "label": "SIMP Essential Forms and Documents",
        },
        {
            "url": "https://www.fisheries.noaa.gov/international/international-affairs/seafood-import-monitoring-program-facts-and-reports",
            "label": "SIMP Facts and Reports",
        },
    ]

    def fetch(self) -> list[dict]:
        records = []

        for page in self.PAGES:
            try:
                # follow_redirects=True is needed because NOAA frequently
                # reorganizes its site and old URLs 301-redirect to new ones.
                # Without this, we'd get a redirect response instead of content
                # and would miss legitimate page updates.
                response = httpx.get(page["url"], timeout=30, follow_redirects=True)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, "lxml")

                # Narrow to the <main> or <article> element to strip out
                # navigation bars, footers, sidebars, and other boilerplate
                # that would pollute change detection with irrelevant diffs.
                # Falls back to full document if neither tag exists.
                main = soup.find("main") or soup.find("article") or soup

                # get_text() with separator="\n" preserves paragraph breaks
                # while collapsing HTML tags. strip=True removes leading/
                # trailing whitespace from each text node, producing clean
                # plaintext suitable for diffing between ingestion runs.
                content = main.get_text(separator="\n", strip=True)

                records.append({
                    # Use the URL as external_id so each page is tracked as a
                    # distinct record across ingestion runs.
                    "external_id": page["url"],
                    "raw_content": content,
                    "metadata_json": {
                        "label": page["label"],
                        "url": page["url"],
                        # html_length is a quick proxy for detecting major page
                        # changes (e.g., a blank page or a drastically shorter
                        # page could indicate a site issue).
                        "html_length": len(response.text),
                    },
                })
            except httpx.HTTPError:
                # If a single page fails (network timeout, 5xx, etc.), skip it
                # and continue with the remaining pages. Partial results are
                # better than no results.
                continue

        return records
