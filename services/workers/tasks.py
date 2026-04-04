from celery import Celery

app = Celery("radar-workers")
app.config_from_object("celeryconfig")


@app.task(bind=True, max_retries=3)
def ingest_federal_register(self):
    """Fetch recent seafood-related documents from the Federal Register API."""
    from ingestion.federal_register import FederalRegisterIngester

    try:
        ingester = FederalRegisterIngester()
        result = ingester.run()
        return result
    except Exception as exc:
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@app.task(bind=True, max_retries=3)
def ingest_fda_import_alerts(self):
    """Scrape FDA Import Alert pages for changes."""
    from ingestion.fda_import_alerts import FDAImportAlertsIngester

    try:
        ingester = FDAImportAlertsIngester()
        result = ingester.run()
        return result
    except Exception as exc:
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@app.task(bind=True, max_retries=3)
def ingest_noaa_simp(self):
    """Monitor NOAA SIMP pages for species list and enforcement changes."""
    from ingestion.noaa_simp import NOAASIMPIngester

    try:
        ingester = NOAASIMPIngester()
        result = ingester.run()
        return result
    except Exception as exc:
        self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
