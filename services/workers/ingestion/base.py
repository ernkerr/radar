"""
Base ingester class — the foundation of Radar's data ingestion layer.

Every data source (Federal Register, FDA, NOAA, etc.) extends this class.
The base class handles all the shared logic:
  - Connecting to Supabase
  - Content hashing (SHA-256) for deduplication
  - Storing new documents in the raw_documents table
  - Logging every ingestion run (success or failure) to ingestion_log

To add a new data source, you only need to:
  1. Create a new file in ingestion/ (e.g., ingestion/my_source.py)
  2. Extend BaseIngester
  3. Set source_name and source_id
  4. Implement the fetch() method

The fetch() method returns a list of dicts, each with:
  - external_id: unique identifier from the source (e.g., document number)
  - raw_content: the full content as a string (JSON, HTML, or text)
  - metadata_json: extracted metadata for quick access without parsing raw_content

See ingestion/federal_register.py for a clean example.
"""

import hashlib
import time
from abc import ABC, abstractmethod

from supabase import create_client
from config import settings


class BaseIngester(ABC):
    """Abstract base class that all source ingesters extend.

    Provides the run() method which orchestrates: fetch → deduplicate → store → log.
    Subclasses only need to implement fetch().
    """

    # These are overridden by each subclass
    source_name: str = ""   # Human-readable name (e.g., "Federal Register")
    source_id: str = ""     # Must match the id in the sources table (e.g., "federal_register")

    def __init__(self):
        # Uses the SERVICE ROLE key to bypass RLS — workers write data for all companies
        self.db = create_client(settings.supabase_url, settings.supabase_service_key)

    def run(self) -> dict:
        """Execute the full ingestion cycle: fetch → deduplicate → store → log.

        Returns a dict like: {"status": "success", "fetched": 96, "new": 12}

        If anything fails, it logs the failure to ingestion_log and re-raises
        the exception (so Celery can retry the task).
        """
        start = time.time()
        try:
            # Step 1: Fetch records from the external source
            records = self.fetch()

            # Step 2: Store each record if it's new (dedup by content hash)
            new_count = 0
            for record in records:
                if self._store_if_new(record):
                    new_count += 1

            # Step 3: Log successful run
            duration_ms = int((time.time() - start) * 1000)
            self._log_run("success", None, duration_ms, len(records))
            return {"status": "success", "fetched": len(records), "new": new_count}

        except Exception as e:
            # Log the failure so it shows up in the ingestion monitor UI
            duration_ms = int((time.time() - start) * 1000)
            self._log_run("failure", str(e), duration_ms, 0)
            raise  # Re-raise so Celery can retry

    @abstractmethod
    def fetch(self) -> list[dict]:
        """Fetch records from the external source. Subclasses must implement this.

        Returns a list of dicts, each with:
          - external_id: str — unique ID from the source (for tracking across runs)
          - raw_content: str — the full content (JSON string, HTML, or plain text)
          - metadata_json: dict — extracted metadata for quick lookups

        Example return value:
            [{
                "external_id": "2026-12345",
                "raw_content": '{"title": "New SIMP Rule", ...}',
                "metadata_json": {"title": "New SIMP Rule", "type": "rule"}
            }]
        """
        ...

    def content_hash(self, content: str) -> str:
        """Generate a SHA-256 hash of the content for deduplication.

        Two documents with the same content will have the same hash,
        so we can skip storing duplicates. If the content changes
        (even slightly), the hash will be different — that's how the
        change detection engine knows something changed.
        """
        return hashlib.sha256(content.encode()).hexdigest()

    def _store_if_new(self, record: dict) -> bool:
        """Store a document in raw_documents if its content hash is new.

        Returns True if the document was stored (it's new).
        Returns False if we already have a document with this exact content hash
        for this source (it's a duplicate — skip it).

        This is how we avoid storing the same document twice across runs.
        """
        h = self.content_hash(record["raw_content"])

        # Check if we already have this exact content for this source
        existing = (
            self.db.table("raw_documents")
            .select("id")
            .eq("source_id", self.source_id)
            .eq("content_hash", h)
            .limit(1)
            .execute()
        )

        if existing.data:
            return False  # Already have this content, skip

        # New content — store it
        self.db.table("raw_documents").insert({
            "source_id": self.source_id,
            "external_id": record.get("external_id"),
            "content_hash": h,
            "raw_content": record["raw_content"],
            "metadata_json": record.get("metadata_json", {}),
        }).execute()

        return True

    def _log_run(self, status: str, error_message: str | None, duration_ms: int, records_fetched: int):
        """Log this ingestion run to the ingestion_log table.

        Every run (success or failure) gets logged. This powers the
        ingestion monitor UI at /config/ingestion which shows run
        history, success rates, and error messages.
        """
        self.db.table("ingestion_log").insert({
            "source_id": self.source_id,
            "status": status,
            "error_message": error_message,
            "duration_ms": duration_ms,
            "records_fetched": records_fetched,
        }).execute()
