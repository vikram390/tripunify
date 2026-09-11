from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.core.config import get_settings
from app.core.db import check_connection, engine
from app.itinerary.router import router as itinerary_router
from app.preferences.router import router as preferences_router
from app.trips.router import router as trips_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await check_connection()
    yield
    await engine.dispose()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(trips_router)
app.include_router(preferences_router)
app.include_router(itinerary_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "environment": settings.ENVIRONMENT}
