"""PostgreSQL connection (SQLAlchemy async engine/session), shared across feature modules."""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def check_connection() -> None:
    """Fail fast with a clear error at startup if Postgres isn't reachable."""
    async with engine.connect():
        pass
