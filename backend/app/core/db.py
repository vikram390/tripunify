"""MongoDB connection (Motor async client), shared across feature modules."""
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client[settings.MONGODB_DB_NAME]


async def connect_and_init() -> None:
    """Fail fast with a clear error if Mongo isn't reachable, and ensure indexes exist."""
    await client.admin.command("ping")
    await db.users.create_index("email", unique=True)
    await db.trips.create_index("invite_code", unique=True)
