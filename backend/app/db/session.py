import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Ensure data directory exists
db_path = Path(settings.DB_PATH).resolve()
db_path.parent.mkdir(parents=True, exist_ok=True)

# Format SQLite URL with forward slashes for cross-platform support
sqlite_url = f"sqlite:///{db_path.as_posix()}"

engine = create_engine(
    sqlite_url,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
