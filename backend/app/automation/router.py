from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import get_current_user
from app.automation.stay_scraper import fetch_stay_options
from app.core.db import get_db
from app.core.models import User
from app.itinerary.schemas import StayOption
from app.trips.service import get_trip_or_404, require_member

router = APIRouter(prefix="/api/trips/{trip_id}/stay-options", tags=["automation"])


@router.get("", response_model=list[StayOption])
async def stay_options(
    trip_id: str,
    refresh: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Live lodging listings for the trip's destination, scraped with Playwright."""
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)
    return await fetch_stay_options(trip.destination, use_cache=not refresh)
