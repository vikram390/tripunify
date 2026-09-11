from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.security import get_current_user
from app.core.db import get_db
from app.core.models import Trip, TripMember, User
from app.trips.schemas import JoinTripRequest, TripCreateRequest, TripDetailOut, TripOut
from app.trips.service import get_trip_or_404, require_member, resolve_members, trip_out
from app.trips.utils import generate_invite_code

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.post("", response_model=TripDetailOut, status_code=status.HTTP_201_CREATED)
async def create_trip(
    payload: TripCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip_id = None
    for _ in range(5):
        trip = Trip(
            name=payload.name.strip(),
            destination=payload.destination.strip(),
            start_date=payload.start_date,
            end_date=payload.end_date,
            budget_min=payload.budget_min,
            budget_max=payload.budget_max,
            organizer_id=current_user.id,
            invite_code=generate_invite_code(),
        )
        db.add(trip)
        db.add(TripMember(trip=trip, user_id=current_user.id))
        try:
            await db.commit()
            trip_id = trip.id
            break
        except IntegrityError:
            await db.rollback()
    if trip_id is None:
        raise HTTPException(status_code=500, detail="Could not generate a unique invite code, try again")

    trip = await get_trip_or_404(str(trip_id), db)
    return TripDetailOut(**trip_out(trip).model_dump(), members=resolve_members(trip))


@router.get("", response_model=list[TripOut])
async def list_trips(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Trip)
        .join(TripMember, TripMember.trip_id == Trip.id)
        .where(TripMember.user_id == current_user.id)
        .options(selectinload(Trip.members))
        .order_by(Trip.created_at.desc())
    )
    trips = result.scalars().all()
    return [trip_out(t) for t in trips]


@router.get("/{trip_id}", response_model=TripDetailOut)
async def get_trip(
    trip_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)
    return TripDetailOut(**trip_out(trip).model_dump(), members=resolve_members(trip))


@router.post("/join", response_model=TripDetailOut)
async def join_trip(
    payload: JoinTripRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip)
        .where(Trip.invite_code == payload.invite_code.strip().upper())
        .options(selectinload(Trip.members).selectinload(TripMember.user))
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")

    if not any(m.user_id == current_user.id for m in trip.members):
        db.add(TripMember(trip_id=trip.id, user_id=current_user.id))
        await db.commit()
        trip = await get_trip_or_404(str(trip.id), db)

    return TripDetailOut(**trip_out(trip).model_dump(), members=resolve_members(trip))
