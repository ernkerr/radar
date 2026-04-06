"""CBP Withhold Release Orders (WRO) dashboard monitor.

Source: U.S. Customs and Border Protection WRO/Findings dashboard page
        (no API available -- HTML scraping with table extraction)

Why it matters for seafood compliance:
    Withhold Release Orders (WROs) are issued by CBP under Section 307 of the
    Tariff Act of 1930 when there is evidence that imported goods were produced
    using forced labor. CBP can detain shipments at the port of entry pending
    investigation. Several WROs have targeted seafood -- notably Chinese
    seafood processors and distant-water fishing fleets. A WRO against a
    supplier or region can immediately block imports, so early detection is
    critical for supply chain risk management.

    Related: "Findings" are the escalation of a WRO. Once CBP determines that
    forced labor was definitively used, the WRO is converted to a formal
    Finding and the goods are subject to seizure and forfeiture.

How the data is fetched:
    The CBP dashboard is a single HTML page with embedded data tables listing
    active WROs and Findings. We scrape the page, extract the full text for
    change detection, and parse each HTML table row into a separate record.
    This row-level granularity allows downstream processors to track individual
    WROs (by country, commodity, entity) rather than treating the whole page as
    a single blob.
"""

import hashlib
import json

import httpx
from bs4 import BeautifulSoup

from ingestion.base import BaseIngester


class CBPWROIngester(BaseIngester):
    """Monitor CBP Withhold Release Orders dashboard for forced labor orders.

    Page: https://www.cbp.gov/newsroom/stats/trade/withhold-release-orders-findings-dashboard
    No API available -- page monitoring with table extraction.
    """

    source_name = "CBP Withhold Release Orders"
    source_id = "cbp_wro"

    URL = "https://www.cbp.gov/newsroom/stats/trade/withhold-release-orders-findings-dashboard"

    def fetch(self) -> list[dict]:
        # follow_redirects=True because CBP occasionally restructures URLs.
        response = httpx.get(self.URL, timeout=30, follow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")
        # Narrow to main content area to exclude nav/footer boilerplate.
        main = soup.find("main") or soup.find("article") or soup
        content = main.get_text(separator="\n", strip=True)

        # The dashboard contains HTML <table> elements listing active WROs
        # and Findings. Each table typically has columns like: Country,
        # Manufacturer/Entity, Commodity, WRO Date, etc.
        tables = soup.find_all("table")
        table_data = []
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                # Capture both <th> (header) and <td> (data) cells so we can
                # use the first row as column headers for dict construction.
                cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                if cells:
                    table_data.append(cells)

        # First record: the full page text, used for coarse change detection
        # (did anything on the page change since last run?).
        records = [{
            "external_id": self.URL,
            "raw_content": content,
            "metadata_json": {
                "url": self.URL,
                "label": "CBP Withhold Release Orders Dashboard",
                "html_length": len(response.text),
                "tables_found": len(tables),
                "table_rows": len(table_data),
            },
        }]

        # Each table row becomes a separate record so that individual WROs can
        # be tracked, diffed, and alerted on independently. For example, if CBP
        # adds a new WRO targeting a shrimp processor, we want that to surface
        # as a distinct new record rather than a change buried in a page diff.
        if table_data and len(table_data) > 1:
            # Treat the first row as column headers (e.g., "Country",
            # "Manufacturer/Shipper", "Merchandise", "Date").
            headers = table_data[0]
            for row in table_data[1:]:
                # If the row has the same number of cells as headers, zip them
                # into a labeled dict. Otherwise, store as a raw list -- this
                # handles merged cells or irregular table formatting gracefully.
                row_dict = dict(zip(headers, row)) if len(row) == len(headers) else {"data": row}

                # Generate a stable external_id from the row content using MD5.
                # This means the same WRO row produces the same ID across runs,
                # enabling deduplication. We truncate to 12 hex chars (48 bits)
                # since collisions are acceptable at this scale.
                records.append({
                    "external_id": f"cbp_wro_{hashlib.md5(str(row).encode()).hexdigest()[:12]}",
                    "raw_content": json.dumps(row_dict),
                    "metadata_json": {
                        "source": "CBP WRO Dashboard Table",
                        # Spread the row fields into metadata so they're
                        # directly queryable (e.g., filter by country).
                        **row_dict,
                    },
                })

        return records
