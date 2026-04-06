from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_key: str = ""
    redis_url: str = "redis://localhost:6379/0"
    anthropic_api_key: str = ""
    tinyfish_api_key: str = ""

    # Federal Register API (no auth needed)
    federal_register_base_url: str = "https://www.federalregister.gov/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()
