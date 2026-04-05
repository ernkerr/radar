"""Quick test: run the Federal Register ingester once and write results to Supabase."""

import hashlib
import json
import os
import time

import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

SOURCE_ID = "federal_register"
BASE_URL = "https://www.federalregister.gov/api/v1"
KEYWORDS = ["seafood", "fish", "import", "HACCP", "SIMP"]
AGENCIES = ["food-and-drug-administration", "national-oceanic-and-atmospheric-administration",
            "customs-and-border-protection", "agriculture-department"]


def content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def fetch():
    records = []
    for keyword in KEYWORDS:
        print(f"  Fetching keyword: {keyword}")
        params = [
            ("per_page", "20"),
            ("order", "newest"),
            ("conditions[term]", keyword),
        ]
        for field in ["document_number", "title", "type", "abstract",
                       "publication_date", "agencies", "html_url"]:
            params.append(("fields[]", field))
        resp = httpx.get(f"{BASE_URL}/documents.json", params=params, timeout=30)
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

    # Deduplicate
    seen = set()
    unique = []
    for r in records:
        if r["external_id"] not in seen:
            seen.add(r["external_id"])
            unique.append(r)
    return unique


def store_if_new(record):
    h = content_hash(record["raw_content"])
    existing = db.table("raw_documents").select("id").eq("source_id", SOURCE_ID).eq("content_hash", h).limit(1).execute()
    if existing.data:
        return False
    db.table("raw_documents").insert({
        "source_id": SOURCE_ID,
        "external_id": record.get("external_id"),
        "content_hash": h,
        "raw_content": record["raw_content"],
        "metadata_json": record.get("metadata_json", {}),
    }).execute()
    return True


def main():
    print("Starting Federal Register ingestion test...")
    start = time.time()
    try:
        records = fetch()
        print(f"  Fetched {len(records)} unique documents")
        new_count = 0
        for r in records:
            if store_if_new(r):
                new_count += 1
        duration_ms = int((time.time() - start) * 1000)

        db.table("ingestion_log").insert({
            "source_id": SOURCE_ID,
            "status": "success",
            "duration_ms": duration_ms,
            "records_fetched": len(records),
        }).execute()

        # Update last_checked on the source
        db.table("sources").update({"last_checked": "now()"}).eq("id", SOURCE_ID).execute()

        print(f"  Done! {new_count} new documents stored, {len(records) - new_count} duplicates skipped")
        print(f"  Duration: {duration_ms}ms")

    except Exception as e:
        duration_ms = int((time.time() - start) * 1000)
        db.table("ingestion_log").insert({
            "source_id": SOURCE_ID,
            "status": "failure",
            "error_message": str(e),
            "duration_ms": duration_ms,
            "records_fetched": 0,
        }).execute()
        print(f"  FAILED: {e}")
        raise


if __name__ == "__main__":
    main()
