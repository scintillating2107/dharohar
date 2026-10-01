import os
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_STORAGE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "storage")
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    PROJECT_NAME: str = "Dharohar - Intelligent Land Record Digitization"
    VERSION: str = "1.0.0"
    API_PREFIX: str = ""

    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "dharohar_db"

    DATABASE_URL: str = "sqlite:///./dharohar.db"
    STORAGE_BASE_DIR: str = _DEFAULT_STORAGE


settings = Settings()
