from pydantic_settings import BaseSettings
from pydantic import Field
import os
from pathlib import Path

# Backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = BASE_DIR.parent / "data" / "yatrasaarthi.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "YatraSaarthi"
    API_V1_STR: str = "/api/v1"
    
    # SQLite Database Configuration (No PostgreSQL / No Docker)
    DB_PATH: str = str(DEFAULT_DB_PATH)
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_PATH}"
    
    # Security
    JWT_SECRET: str = "yatrasaarthi_production_secret_key_change_in_env_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Mapbox Directions API Integration
    MAPBOX_ACCESS_TOKEN: str = Field(default="", env="MAPBOX_ACCESS_TOKEN")
    
    # Vehicle & Navigation defaults
    DEFAULT_VEHICLE_TYPE: str = "CAR"
    ENABLE_AI_RESIDUALS: bool = True
    MAX_WS_BUFFER_SIZE: int = 100
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
