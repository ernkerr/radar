"""
Configuration for the Radar workers service.

All settings are loaded from environment variables (or a .env file).
Uses pydantic-settings to validate and type-check config values.

This file is imported by other modules as:
    from config import settings

NOTE: pydantic doesn't support Python 3.14 yet. For local testing,
we use test_ingest.py which loads .env directly with python-dotenv.
This config is used when running via Celery in production.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """All environment variables the workers service needs.

    These map 1:1 to env vars. For example, SUPABASE_URL in .env
    becomes settings.supabase_url in code.
    """

    # Supabase connection — uses the SERVICE ROLE key (not the anon key)
    # because workers need to bypass Row-Level Security to write data
    # for all companies, not just one authenticated user.
    supabase_url: str = ""
    supabase_service_key: str = ""

    # Redis is the message broker for Celery task queue.
    # Workers pick up jobs from Redis, and results are stored back in Redis.
    redis_url: str = "redis://localhost:6379/0"

    # Claude API key for the LLM relevance analysis (D5 — hybrid approach).
    # If not set, the system falls back to rule-based matching only.
    anthropic_api_key: str = ""

    # TinyFish API key for the execution layer (D7 — P2 feature).
    # Used to interact with ERPs/WMS/QMS that don't have native APIs.
    tinyfish_api_key: str = ""

    # Federal Register API — no auth needed, this is just the base URL.
    # Docs: https://www.federalregister.gov/developers/documentation/api/v1
    federal_register_base_url: str = "https://www.federalregister.gov/api/v1"

    class Config:
        # pydantic-settings will look for a .env file in the current directory
        env_file = ".env"


# Singleton instance — import this in other files
settings = Settings()
