from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Changed to PostgreSQL connection for pgvector
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://fras_user:fras_password@127.0.0.1:5433/fras_db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
