from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import get_current_user
from app.core.db import get_db
from app.core.models import Preference, User
from app.preferences.schemas import (
    MemberStatusOut,
    PreferencesOut,
    PreferencesStatusOut,
    PreferencesUpsertRequest,
)
from app.trips.service import get_trip_or_404, require_member

router = APIRouter(prefix="/api/trips/{trip_id}/preferences", tags=["preferences"])


def _pref_out(pref: Preference) -> PreferencesOut:
    return PreferencesOut(
        interests=pref.interests,
        budget_comfort=pref.budget_comfort,
        date_flexibility=pref.date_flexibility,
        must_see=pref.must_see,
        submitted_at=pref.submitted_at,
    )


@router.put("/me", response_model=PreferencesOut)
async def upsert_my_preferences(
    trip_id: str,
    payload: PreferencesUpsertRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)

    values = {
        "interests": payload.interests,
        "budget_comfort": payload.budget_comfort,
        "date_flexibility": payload.date_flexibility,
        "must_see": payload.must_see.strip(),
        "submitted_at": datetime.now(timezone.utc),
    }
    stmt = (
        pg_insert(Preference)
        .values(trip_id=trip.id, user_id=current_user.id, **values)
        .on_conflict_do_update(index_elements=["trip_id", "user_id"], set_=values)
        .returning(Preference)
    )
    result = await db.execute(stmt)
    await db.commit()
    return _pref_out(result.scalar_one())


@router.get("/me", response_model=PreferencesOut | None)
async def get_my_preferences(
    trip_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)

    pref = await db.scalar(
        select(Preference).where(Preference.trip_id == trip.id, Preference.user_id == current_user.id)
    )
    return _pref_out(pref) if pref else None


@router.get("/status", response_model=PreferencesStatusOut)
async def get_preferences_status(
    trip_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    trip = await get_trip_or_404(trip_id, db)
    require_member(trip, current_user.id)

    result = await db.execute(select(Preference.user_id).where(Preference.trip_id == trip.id))
    submitted_ids = set(result.scalars().all())

    members_status = [
        MemberStatusOut(user_id=str(m.user_id), name=m.user.name, submitted=m.user_id in submitted_ids)
        for m in trip.members
    ]
    return PreferencesStatusOut(
        total_members=len(trip.members),
        submitted_count=len(submitted_ids),
        all_submitted=len(submitted_ids) >= len(trip.members),
        members=members_status,
    )
