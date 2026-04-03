import os
from pathlib import Path
from dotenv import load_dotenv
from src.core.logger import logger
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# set path to .env file
env_path = Path(__file__).parent.parent / "core" / ".env"

# load .env file
load_dotenv(dotenv_path=env_path)

# get database info
# debug printing **TO BE REMOVED**
db_url = os.getenv("DATABASE_URL")
masked_url = db_url.split("@")[1] if "@" in db_url else "INVALUD_URL_FORMAT"
logger.debug(f"Targeting Database Host: ...@{masked_url}")

engine = create_engine(db_url, echo=True, pool_pre_ping=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    
def get_db():
    with Session(engine) as session:
        yield session