"""Shared trip lookups used by trips, preferences, and itinerary routers."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.models import Trip, TripMember
from app.trips.schemas import MemberOut, TripOut


def oid(id_str: str) -> uuid.UUID:
    try:
        return uuid.UUID(id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")


async def get_trip_or_404(trip_id: str, db: AsyncSession) -> Trip:
    trip_uuid = oid(trip_id)
    result = await db.execute(
        select(Trip)
        .where(Trip.id == trip_uuid)
        .options(selectinload(Trip.members).selectinload(TripMember.user))
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


def require_member(trip: Trip, user_id: uuid.UUID) -> None:
    if not any(m.user_id == user_id for m in trip.members):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this trip")


def require_organizer(trip: Trip, user_id: uuid.UUID) -> None:
    if trip.organizer_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the organizer can do this")


def trip_out(trip: Trip) -> TripOut:
    return TripOut(
        id=str(trip.id),
        name=trip.name,
        destination=trip.destination,
        start_date=trip.start_date,
        end_date=trip.end_date,
        budget_min=trip.budget_min,
        budget_max=trip.budget_max,
        invite_code=trip.invite_code,
        organizer_id=str(trip.organizer_id),
        member_count=len(trip.members),
        created_at=trip.created_at,
    )


def resolve_members(trip: Trip) -> list[MemberOut]:
    return [
        MemberOut(
            id=str(m.user_id),
            name=m.user.name,
            email=m.user.email,
            is_organizer=(m.user_id == trip.organizer_id),
            joined_at=m.joined_at,
        )
        for m in trip.members
    ]
