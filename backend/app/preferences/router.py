from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends

from app.auth.security import get_current_user
from app.core.db import db
from app.preferences.schemas import (
    MemberStatusOut,
    PreferencesOut,
    PreferencesStatusOut,
    PreferencesUpsertRequest,
)
from app.trips.service import get_trip_or_404, require_member

router = APIRouter(prefix="/api/trips/{trip_id}/preferences", tags=["preferences"])


@router.put("/me", response_model=PreferencesOut)
async def upsert_my_preferences(
    trip_id: str, payload: PreferencesUpsertRequest, current_user: dict = Depends(get_current_user)
):
    trip = await get_trip_or_404(trip_id)
    user_id = str(current_user["_id"])
    require_member(trip, user_id)

    doc = {
        "trip_id": trip_id,
        "user_id": user_id,
        "interests": payload.interests,
        "budget_comfort": payload.budget_comfort,
        "date_flexibility": payload.date_flexibility,
        "must_see": payload.must_see.strip(),
        "submitted_at": datetime.now(timezone.utc),
    }
    await db.preferences.update_one({"trip_id": trip_id, "user_id": user_id}, {"$set": doc}, upsert=True)
    return PreferencesOut(**doc)


@router.get("/me", response_model=PreferencesOut | None)
async def get_my_preferences(trip_id: str, current_user: dict = Depends(get_current_user)):
    trip = await get_trip_or_404(trip_id)
    user_id = str(current_user["_id"])
    require_member(trip, user_id)

    doc = await db.preferences.find_one({"trip_id": trip_id, "user_id": user_id})
    return PreferencesOut(**doc) if doc else None


@router.get("/status", response_model=PreferencesStatusOut)
async def get_preferences_status(trip_id: str, current_user: dict = Depends(get_current_user)):
    trip = await get_trip_or_404(trip_id)
    require_member(trip, str(current_user["_id"]))

    submitted_docs = await db.preferences.find({"trip_id": trip_id}).to_list(length=None)
    submitted_user_ids = {d["user_id"] for d in submitted_docs}

    member_ids = [ObjectId(m["user_id"]) for m in trip["members"]]
    users = await db.users.find({"_id": {"$in": member_ids}}).to_list(length=None)
    users_by_id = {str(u["_id"]): u for u in users}

    members_status = []
    for m in trip["members"]:
        user = users_by_id.get(m["user_id"])
        if not user:
            continue
        members_status.append(
            MemberStatusOut(user_id=m["user_id"], name=user["name"], submitted=m["user_id"] in submitted_user_ids)
        )

    return PreferencesStatusOut(
        total_members=len(trip["members"]),
        submitted_count=len(submitted_user_ids),
        all_submitted=len(submitted_user_ids) >= len(trip["members"]),
        members=members_status,
    )
