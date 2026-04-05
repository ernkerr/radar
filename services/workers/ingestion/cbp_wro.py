import hashlib
import json

import httpx
from bs4 import BeautifulSoup

from ingestion.base import BaseIngester


class CBPWROIngester(BaseIngester):
    """Monitor CBP Withhold Release Orders dashboard for forced labor orders.

    Page: https://www.cbp.gov/newsroom/stats/trade/withhold-release-orders-findings-dashboard
    No API available — page monitoring with table extraction.
    """

    source_name = "CBP Withhold Release Orders"
    source_id = "cbp_wro"

    URL = "https://www.cbp.gov/newsroom/stats/trade/withhold-release-orders-findings-dashboard"

    def fetch(self) -> list[dict]:
        response = httpx.get(self.URL, timeout=30, follow_redirects=True)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")
        main = soup.find("main") or soup.find("article") or soup
        content = main.get_text(separator="\n", strip=True)

        # Extract any data tables
        tables = soup.find_all("table")
        table_data = []
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
                if cells:
                    table_data.append(cells)

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

        # Store each table row as a separate record if we found structured data
        if table_data and len(table_data) > 1:
            headers = table_data[0]
            for row in table_data[1:]:
                row_dict = dict(zip(headers, row)) if len(row) == len(headers) else {"data": row}
                records.append({
                    "external_id": f"cbp_wro_{hashlib.md5(str(row).encode()).hexdigest()[:12]}",
                    "raw_content": json.dumps(row_dict),
                    "metadata_json": {
                        "source": "CBP WRO Dashboard Table",
                        **row_dict,
                    },
                })

        return records
