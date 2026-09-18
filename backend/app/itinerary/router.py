from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import get_current_user
from app.core.db import get_db
from app.core.models import User
from app.itinerary.schemas import DayRegenerateRequest, ItineraryOut
from app.itinerary.service import generate_itinerary, get_itinerary, regenerate_day
from app.trips.service import get_trip_or_404, require_member, require_organizer

router = APIRouter(prefix="/api/trips/{trip_id}/itinerary", tags=["itinerary"])


@router.post("/generate", response_model=ItineraryOut)
async def generate(
    trip_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    trip = await get_trip_or_404(trip_id, db)
    require_organizer(trip, current_user.id)
    return await generate_itinerary(trip, db)


@router.get("", response_model=ItineraryOut | None)
async def get(trip_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)
    return await get_itinerary(trip, db)


@router.post("/days/{day_number}/regenerate", response_model=ItineraryOut)
async def regenerate(
    trip_id: str,
    day_number: int,
    payload: DayRegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)
    return await regenerate_day(trip, db, day_number, payload.instruction)
