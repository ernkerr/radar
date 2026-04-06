import hashlib
import time
from abc import ABC, abstractmethod

from supabase import create_client
from config import settings


class BaseIngester(ABC):
    """Base class for all data source ingesters.

    Handles Supabase connection, content hashing, document storage,
    and ingestion logging (success/failure).
    """

    source_name: str = ""
    source_id: str = ""

    def __init__(self):
        self.db = create_client(settings.supabase_url, settings.supabase_service_key)

    def run(self) -> dict:
        """Execute the ingestion and log the result."""
        start = time.time()
        try:
            records = self.fetch()
            new_count = 0
            for record in records:
                if self._store_if_new(record):
                    new_count += 1
            duration_ms = int((time.time() - start) * 1000)
            self._log_run("success", None, duration_ms, len(records))
            return {"status": "success", "fetched": len(records), "new": new_count}
        except Exception as e:
            duration_ms = int((time.time() - start) * 1000)
            self._log_run("failure", str(e), duration_ms, 0)
            raise

    @abstractmethod
    def fetch(self) -> list[dict]:
        """Fetch records from the external source.

        Each record must have:
        - external_id: str (unique ID from the source)
        - raw_content: str (the full content)
        - metadata_json: dict (any additional metadata)
        """
        ...

    def content_hash(self, content: str) -> str:
        return hashlib.sha256(content.encode()).hexdigest()

    def _store_if_new(self, record: dict) -> bool:
        """Store a document if its content hash is new. Returns True if stored."""
        h = self.content_hash(record["raw_content"])

        existing = (
            self.db.table("raw_documents")
            .select("id")
            .eq("source_id", self.source_id)
            .eq("content_hash", h)
            .limit(1)
            .execute()
        )

        if existing.data:
            return False

        self.db.table("raw_documents").insert({
            "source_id": self.source_id,
            "external_id": record.get("external_id"),
            "content_hash": h,
            "raw_content": record["raw_content"],
            "metadata_json": record.get("metadata_json", {}),
        }).execute()

        return True

    def _log_run(self, status: str, error_message: str | None, duration_ms: int, records_fetched: int):
        self.db.table("ingestion_log").insert({
            "source_id": self.source_id,
            "status": status,
            "error_message": error_message,
            "duration_ms": duration_ms,
            "records_fetched": records_fetched,
        }).execute()
