from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.auth.security import get_current_user
from app.core.db import db
from app.trips.schemas import JoinTripRequest, TripCreateRequest, TripDetailOut, TripOut
from app.trips.service import get_trip_or_404, require_member, resolve_members, trip_out
from app.trips.utils import generate_invite_code

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.post("", response_model=TripDetailOut, status_code=status.HTTP_201_CREATED)
async def create_trip(payload: TripCreateRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    now = datetime.now(timezone.utc)

    trip_doc = {
        "name": payload.name.strip(),
        "destination": payload.destination.strip(),
        "start_date": payload.start_date.isoformat(),
        "end_date": payload.end_date.isoformat(),
        "budget_min": payload.budget_min,
        "budget_max": payload.budget_max,
        "organizer_id": user_id,
        "invite_code": generate_invite_code(),
        "members": [{"user_id": user_id, "joined_at": now}],
        "created_at": now,
    }

    result = None
    for _ in range(5):
        try:
            result = await db.trips.insert_one(trip_doc)
            break
        except DuplicateKeyError:
            trip_doc["invite_code"] = generate_invite_code()
    if result is None:
        raise HTTPException(status_code=500, detail="Could not generate a unique invite code, try again")

    trip_doc["_id"] = result.inserted_id
    members = await resolve_members(trip_doc)
    return TripDetailOut(**trip_out(trip_doc).model_dump(), members=members)


@router.get("", response_model=list[TripOut])
async def list_trips(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cursor = db.trips.find({"members.user_id": user_id}).sort("created_at", -1)
    trips = await cursor.to_list(length=None)
    return [trip_out(t) for t in trips]


@router.get("/{trip_id}", response_model=TripDetailOut)
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    trip = await get_trip_or_404(trip_id)
    require_member(trip, str(current_user["_id"]))
    members = await resolve_members(trip)
    return TripDetailOut(**trip_out(trip).model_dump(), members=members)


@router.post("/join", response_model=TripDetailOut)
async def join_trip(payload: JoinTripRequest, current_user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"invite_code": payload.invite_code.strip().upper()})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")

    user_id = str(current_user["_id"])
    member_ids = {m["user_id"] for m in trip["members"]}
    if user_id not in member_ids:
        await db.trips.update_one(
            {"_id": trip["_id"]},
            {"$push": {"members": {"user_id": user_id, "joined_at": datetime.now(timezone.utc)}}},
        )
        trip = await db.trips.find_one({"_id": trip["_id"]})

    members = await resolve_members(trip)
    return TripDetailOut(**trip_out(trip).model_dump(), members=members)
