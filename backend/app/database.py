import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Free-tier friendly: falls back to a local SQLite file if no DATABASE_URL is set.
# Swap in a free Neon Postgres URL (neon.tech) when you're ready for real deployment.
DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./prajaavaani.db"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
