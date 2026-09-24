import re

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import get_current_user
from app.core.db import get_db
from app.core.models import Trip, User
from app.itinerary.export import build_ics, build_pdf
from app.itinerary.schemas import DayRegenerateRequest, ItineraryOut, StatusUpdateRequest
from app.itinerary.service import generate_itinerary, get_itinerary, regenerate_day, set_finalized
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


@router.put("/status", response_model=ItineraryOut)
async def update_status(
    trip_id: str,
    payload: StatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Organizer finalizes the trip (locks changes) or reopens it for more edits."""
    trip = await get_trip_or_404(trip_id, db)
    require_organizer(trip, current_user.id)
    return await set_finalized(trip, db, payload.status == "finalized")


async def _trip_and_itinerary(trip_id: str, user: User, db: AsyncSession) -> tuple[Trip, ItineraryOut]:
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, user.id)
    itinerary = await get_itinerary(trip, db)
    if not itinerary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No itinerary to export yet")
    return trip, itinerary


def _filename(trip: Trip, ext: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", trip.name.lower()).strip("-") or "trip"
    return f"{slug}-itinerary.{ext}"


@router.get("/export.pdf")
async def export_pdf(trip_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    trip, itinerary = await _trip_and_itinerary(trip_id, current_user, db)
    return Response(
        content=build_pdf(trip, itinerary),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_filename(trip, "pdf")}"'},
    )


@router.get("/export.ics")
async def export_ics(trip_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    trip, itinerary = await _trip_and_itinerary(trip_id, current_user, db)
    return Response(
        content=build_ics(trip, itinerary),
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{_filename(trip, "ics")}"'},
    )
