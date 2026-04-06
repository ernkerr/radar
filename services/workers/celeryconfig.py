"""
Celery configuration for the Radar workers service.

Celery is a task queue — it lets us run background jobs on a schedule.
Two components:
  1. celery worker — picks up and executes tasks (the actual ingestion)
  2. celery beat — acts as a scheduler, sending tasks at defined intervals

To run locally:
  celery -A tasks worker --loglevel=info     # start the worker
  celery -A tasks beat --loglevel=info        # start the scheduler

The beat_schedule below defines how often each data source is checked.
These intervals were chosen based on how frequently each source updates (D15).
"""

from config import settings

# Redis connection — Celery uses this as both the message broker
# (where tasks are queued) and result backend (where results are stored)
broker_url = settings.redis_url
result_backend = settings.redis_url

# Serialize everything as JSON (not pickle) for security and readability
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]

# All times in UTC to avoid timezone confusion
timezone = "UTC"
enable_utc = True

# task_acks_late = True means the task isn't marked as "done" until it
# actually completes. If a worker crashes mid-task, another worker can
# pick it up. This prevents data loss.
task_acks_late = True
task_reject_on_worker_lost = True

# Scheduled ingestion jobs — Celery Beat sends these tasks at these intervals.
# Each task calls the corresponding ingester (see tasks.py).
beat_schedule = {
    # Federal Register: REST API, well-structured, updates a few times per day
    "ingest-federal-register": {
        "task": "tasks.ingest_federal_register",
        "schedule": 7200.0,  # Every 2 hours (7200 seconds)
    },
    # FDA enforcement: openFDA API, recalls/safety alerts
    "ingest-fda-import-alerts": {
        "task": "tasks.ingest_fda_import_alerts",
        "schedule": 3600.0,  # Every 1 hour
    },
    # NOAA SIMP: page monitoring, changes less frequently
    "ingest-noaa-simp": {
        "task": "tasks.ingest_noaa_simp",
        "schedule": 21600.0,  # Every 6 hours
    },
}
