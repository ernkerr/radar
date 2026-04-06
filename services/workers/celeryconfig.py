from config import settings

broker_url = settings.redis_url
result_backend = settings.redis_url

task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]
timezone = "UTC"
enable_utc = True

# Retry failed tasks up to 3 times with exponential backoff
task_acks_late = True
task_reject_on_worker_lost = True

beat_schedule = {
    "ingest-federal-register": {
        "task": "tasks.ingest_federal_register",
        "schedule": 7200.0,  # Every 2 hours
    },
    "ingest-fda-import-alerts": {
        "task": "tasks.ingest_fda_import_alerts",
        "schedule": 3600.0,  # Every 1 hour
    },
    "ingest-noaa-simp": {
        "task": "tasks.ingest_noaa_simp",
        "schedule": 21600.0,  # Every 6 hours
    },
}
