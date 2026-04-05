"""Run an ingester manually against Supabase. Usage: python test_ingest.py [source]

Sources: federal_register, noaa_simp, fda_import_alerts, all
Default: all
"""

import hashlib
import json
import os
import sys
import time

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def store_if_new(source_id: str, record: dict) -> bool:
    h = content_hash(record["raw_content"])
    existing = db.table("raw_documents").select("id").eq("source_id", source_id).eq("content_hash", h).limit(1).execute()
    if existing.data:
        return False
    db.table("raw_documents").insert({
        "source_id": source_id,
        "external_id": record.get("external_id"),
        "content_hash": h,
        "raw_content": record["raw_content"],
        "metadata_json": record.get("metadata_json", {}),
    }).execute()
    return True


def log_run(source_id: str, status: str, duration_ms: int, records_fetched: int, error_message: str | None = None):
    db.table("ingestion_log").insert({
        "source_id": source_id,
        "status": status,
        "duration_ms": duration_ms,
        "records_fetched": records_fetched,
        "error_message": error_message,
    }).execute()


def run_source(source_id: str, fetch_fn):
    print(f"\n{'='*50}")
    print(f"Running: {source_id}")
    print(f"{'='*50}")
    start = time.time()
    try:
        records = fetch_fn()
        print(f"  Fetched {len(records)} records")
        new_count = 0
        for r in records:
            if store_if_new(source_id, r):
                new_count += 1
        duration_ms = int((time.time() - start) * 1000)
        log_run(source_id, "success", duration_ms, len(records))
        print(f"  {new_count} new, {len(records) - new_count} duplicates skipped")
        print(f"  Duration: {duration_ms}ms")
    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        log_run(source_id, "failure", duration_ms, 0, str(e))
        print(f"  FAILED: {e}")


# ============================================================
# FEDERAL REGISTER
# ============================================================

def fetch_federal_register():
    base = "https://www.federalregister.gov/api/v1"
    keywords = ["seafood", "fish", "import", "HACCP", "SIMP"]
    records = []

    for keyword in keywords:
        print(f"  Keyword: {keyword}")
        params = [
            ("per_page", "20"),
            ("order", "newest"),
            ("conditions[term]", keyword),
        ]
        for field in ["document_number", "title", "type", "abstract",
                       "publication_date", "agencies", "html_url"]:
            params.append(("fields[]", field))
        resp = httpx.get(f"{base}/documents.json", params=params, timeout=30)
        resp.raise_for_status()
        for doc in resp.json().get("results", []):
            records.append({
                "external_id": doc.get("document_number"),
                "raw_content": json.dumps(doc),
                "metadata_json": {
                    "title": doc.get("title"),
                    "type": doc.get("type"),
                    "publication_date": doc.get("publication_date"),
                    "agencies": [a.get("name") for a in doc.get("agencies", [])],
                    "html_url": doc.get("html_url"),
                    "keyword_match": keyword,
                },
            })

    seen = set()
    return [r for r in records if r["external_id"] not in seen and not seen.add(r["external_id"])]


# ============================================================
# NOAA SIMP
# ============================================================

NOAA_PAGES = [
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


def fetch_noaa_simp():
    records = []
    for page in NOAA_PAGES:
        print(f"  Page: {page['label']}")
        try:
            resp = httpx.get(page["url"], timeout=30, follow_redirects=True)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            main = soup.find("main") or soup.find("article") or soup
            content = main.get_text(separator="\n", strip=True)
            records.append({
                "external_id": page["url"],
                "raw_content": content,
                "metadata_json": {
                    "label": page["label"],
                    "url": page["url"],
                    "html_length": len(resp.text),
                },
            })
        except httpx.HTTPError as e:
            print(f"    Skipped: {e}")
    return records


# ============================================================
# FDA IMPORT ALERTS (via openFDA API)
# ============================================================

FDA_API = "https://api.fda.gov/food/enforcement.json"
FDA_SEARCH_TERMS = ["seafood", "fish", "shrimp", "salmon", "cod", "tuna",
                    "crab", "lobster", "oyster", "shellfish", "squid"]


def fetch_fda_import_alerts():
    records = []
    search_query = " OR ".join(f'product_description:"{t}"' for t in FDA_SEARCH_TERMS)
    print(f"  Querying openFDA enforcement API...")

    resp = httpx.get(FDA_API, params={
        "search": search_query,
        "limit": 100,
        "sort": "report_date:desc",
    }, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    print(f"  Total matching: {data['meta']['results']['total']}")
    for r in data.get("results", []):
        records.append({
            "external_id": r.get("recall_number"),
            "raw_content": json.dumps(r),
            "metadata_json": {
                "product_description": r.get("product_description", "")[:200],
                "reason_for_recall": r.get("reason_for_recall", "")[:200],
                "report_date": r.get("report_date"),
                "classification": r.get("classification"),
                "status": r.get("status"),
                "recalling_firm": r.get("recalling_firm"),
                "city": r.get("city"),
                "state": r.get("state"),
                "country": r.get("country"),
            },
        })
    return records


# ============================================================
# FDA RSS FEEDS (Food Safety Recalls + Outbreaks)
# ============================================================

FDA_RSS_FEEDS = [
    {
        "id": "fda_food_safety_recalls",
        "url": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-safety-recalls/rss.xml",
        "label": "FDA Food Safety Recalls",
    },
    {
        "id": "fda_outbreaks",
        "url": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/fda-outbreaks/rss.xml",
        "label": "FDA Outbreaks",
    },
]


def fetch_fda_rss():
    import feedparser
    records = []
    for feed_info in FDA_RSS_FEEDS:
        print(f"  Feed: {feed_info['label']}")
        feed = feedparser.parse(feed_info["url"])
        print(f"    Entries: {len(feed.entries)}")
        for entry in feed.entries:
            records.append({
                "external_id": entry.get("id") or entry.get("link"),
                "raw_content": json.dumps({
                    "title": entry.get("title"),
                    "summary": entry.get("summary"),
                    "link": entry.get("link"),
                    "published": entry.get("published"),
                }),
                "metadata_json": {
                    "title": entry.get("title", "")[:200],
                    "link": entry.get("link"),
                    "published": entry.get("published"),
                    "feed": feed_info["label"],
                },
            })
    return records


# ============================================================
# CBP WITHHOLD RELEASE ORDERS (Forced Labor)
# ============================================================

CBP_WRO_URL = "https://www.cbp.gov/newsroom/stats/trade/withhold-release-orders-findings-dashboard"


def fetch_cbp_wro():
    print(f"  Page: {CBP_WRO_URL}")
    resp = httpx.get(CBP_WRO_URL, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    main = soup.find("main") or soup.find("article") or soup
    content = main.get_text(separator="\n", strip=True)

    # Also try to find any data tables on the page
    tables = soup.find_all("table")
    table_data = []
    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
            if cells:
                table_data.append(cells)

    records = [{
        "external_id": CBP_WRO_URL,
        "raw_content": content,
        "metadata_json": {
            "url": CBP_WRO_URL,
            "label": "CBP Withhold Release Orders Dashboard",
            "html_length": len(resp.text),
            "tables_found": len(tables),
            "table_rows": len(table_data),
        },
    }]

    # If we found table data, store each row as a separate record
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

    print(f"  Found {len(records)} records ({len(tables)} tables, {len(table_data)} rows)")
    return records


# ============================================================
# NOAA MMPA IMPORT PROVISIONS
# ============================================================

MMPA_PAGES = [
    {
        "url": "https://www.fisheries.noaa.gov/content/noaa-fisheries-establishes-international-marine-mammal-bycatch-criteria-us-imports",
        "label": "MMPA Bycatch Criteria for US Imports",
    },
    {
        "url": "https://www.fisheries.noaa.gov/international-affairs/2025-marine-mammal-protection-act-comparability-finding-determinations",
        "label": "MMPA 2025 Comparability Findings",
    },
]


def fetch_noaa_mmpa():
    records = []
    for page in MMPA_PAGES:
        print(f"  Page: {page['label']}")
        try:
            resp = httpx.get(page["url"], timeout=30, follow_redirects=True)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")
            main = soup.find("main") or soup.find("article") or soup
            content = main.get_text(separator="\n", strip=True)
            records.append({
                "external_id": page["url"],
                "raw_content": content,
                "metadata_json": {
                    "label": page["label"],
                    "url": page["url"],
                    "html_length": len(resp.text),
                },
            })
        except httpx.HTTPError as e:
            print(f"    Skipped: {e}")
    return records


# ============================================================
# MAIN
# ============================================================

SOURCES = {
    "federal_register": fetch_federal_register,
    "noaa_simp": fetch_noaa_simp,
    "fda_import_alerts": fetch_fda_import_alerts,
    "fda_rss": fetch_fda_rss,
    "cbp_wro": fetch_cbp_wro,
    "noaa_mmpa": fetch_noaa_mmpa,
}

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "all":
        for source_id, fetch_fn in SOURCES.items():
            run_source(source_id, fetch_fn)
    elif target in SOURCES:
        run_source(target, SOURCES[target])
    else:
        print(f"Unknown source: {target}")
        print(f"Available: {', '.join(SOURCES.keys())}, all")
        sys.exit(1)
