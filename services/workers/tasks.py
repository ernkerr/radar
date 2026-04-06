"""
Celery task definitions for Radar.

Each task wraps an ingester class. Celery Beat (the scheduler) triggers
these on a schedule defined in celeryconfig.py. Each task:
  1. Creates an instance of the ingester
  2. Calls ingester.run() which fetches data and stores it in Supabase
  3. Retries up to 3 times with exponential backoff if something fails

The "bind=True" parameter gives us access to self.retry() for error handling.
Imports are inside the functions (not at top level) so Celery can discover
tasks without importing heavy dependencies upfront.
"""

from celery import Celery

# Create the Celery app and load config from celeryconfig.py
app = Celery("radar-workers")
app.config_from_object("celeryconfig")


@app.task(bind=True, max_retries=3)
def ingest_federal_register(self):
    """Fetch recent seafood-related documents from the Federal Register API.

    Searches for keywords like "seafood", "fish", "HACCP", "SIMP" and
    stores matching documents in the raw_documents table.
    """
    from ingestion.federal_register import FederalRegisterIngester

    try:
        ingester = FederalRegisterIngester()
        result = ingester.run()
        return result
    except Exception as exc:
        # Exponential backoff: 1min, 2min, 4min
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@app.task(bind=True, max_retries=3)
def ingest_fda_import_alerts(self):
    """Fetch seafood enforcement actions from the openFDA API.

    Queries the food/enforcement endpoint for recalls and safety alerts
    matching seafood-related product descriptions.
    """
    from ingestion.fda_import_alerts import FDAImportAlertsIngester

    try:
        ingester = FDAImportAlertsIngester()
        result = ingester.run()
        return result
    except Exception as exc:
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@app.task(bind=True, max_retries=3)
def ingest_noaa_simp(self):
    """Monitor NOAA SIMP pages for species list and enforcement changes.

    Fetches the main SIMP page, essential forms, and facts & reports pages.
    Stores the text content for change detection to diff against later.
    """
    from ingestion.noaa_simp import NOAASIMPIngester

    try:
        ingester = NOAASIMPIngester()
        result = ingester.run()
        return result
    except Exception as exc:
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
