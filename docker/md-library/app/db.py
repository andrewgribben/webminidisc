import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

logger = logging.getLogger(__name__)

# Use SQLite as fallback if DATABASE_URL is not set
database_url = os.environ.get("DATABASE_URL", "sqlite:///./minidisc.db")

# If using SQLite, normalize the path and handle the case where a directory was mounted
if database_url.startswith("sqlite"):
    # forms: sqlite:///relative.db  or sqlite:////absolute/path.db  or sqlite:///:memory:
    prefix = "sqlite:///"
    raw_path = database_url[len(prefix):] if database_url.startswith(prefix) else database_url.split("sqlite:///")[-1]
    if raw_path and raw_path != ":memory:":
        # Expand user and make absolute relative to CWD if relative
        if not raw_path.startswith('/'):
            raw_path_fs = os.path.abspath(os.path.join(os.getcwd(), raw_path))
        else:
            raw_path_fs = raw_path
        # If the path points to a directory (common when a host dir was bind-mounted onto intended file path), place DB file inside it
        if os.path.isdir(raw_path_fs):
            corrected_path = os.path.join(raw_path_fs, "minidisc.db")
            logger.warning(
                "SQLite path '%s' is a directory; using '%s' inside it for database file.",
                raw_path_fs,
                corrected_path,
            )
            raw_path_fs = corrected_path
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(raw_path_fs), exist_ok=True)
        # Reconstruct database_url with absolute path for clarity
        database_url = f"sqlite:///{raw_path_fs}"

engine = create_engine(
    database_url,
    future=True,
    connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

def init_db():
    Base.metadata.create_all(bind=engine)
