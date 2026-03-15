import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# PostgreSQL connection for Railway
# Railway provides DATABASE_URL. We need to ensure it uses the postgresql+asyncpg:// protocol.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Use postgresql+asyncpg for SQLAlchemy async support
    # Only replace if it doesn't already have the +asyncpg driver specified
    if "postgresql+asyncpg" not in DATABASE_URL:
        if DATABASE_URL.startswith("postgres://"):
            DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        elif DATABASE_URL.startswith("postgresql://"):
            DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    # Fallback to SQLite for local development if DATABASE_URL is missing
    DATABASE_URL = "sqlite+aiosqlite:///./helpit.db"

# connect_args={"check_same_thread": False} is only needed for SQLite
engine_args = {}
if DATABASE_URL.startswith("sqlite"):
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(DATABASE_URL, **engine_args)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
