from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.auth.security import get_current_user
from app.core.db import db
from app.trips.schemas import JoinTripRequest, MemberOut, TripCreateRequest, TripDetailOut, TripOut
from app.trips.utils import generate_invite_code

router = APIRouter(prefix="/api/trips", tags=["trips"])


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")


def _trip_out(trip: dict) -> TripOut:
    return TripOut(
        id=str(trip["_id"]),
        name=trip["name"],
        destination=trip["destination"],
        start_date=trip["start_date"],
        end_date=trip["end_date"],
        budget_min=trip["budget_min"],
        budget_max=trip["budget_max"],
        invite_code=trip["invite_code"],
        organizer_id=trip["organizer_id"],
        member_count=len(trip["members"]),
        created_at=trip["created_at"],
    )


def _require_member(trip: dict, user_id: str) -> None:
    member_ids = {m["user_id"] for m in trip["members"]}
    if user_id not in member_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this trip")


async def _resolve_members(trip: dict) -> list[MemberOut]:
    user_ids = [ObjectId(m["user_id"]) for m in trip["members"]]
    users = await db.users.find({"_id": {"$in": user_ids}}).to_list(length=None)
    users_by_id = {str(u["_id"]): u for u in users}
    out = []
    for m in trip["members"]:
        user = users_by_id.get(m["user_id"])
        if not user:
            continue
        out.append(
            MemberOut(
                id=m["user_id"],
                name=user["name"],
                email=user["email"],
                is_organizer=(m["user_id"] == trip["organizer_id"]),
                joined_at=m["joined_at"],
            )
        )
    return out


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
    members = await _resolve_members(trip_doc)
    return TripDetailOut(**_trip_out(trip_doc).model_dump(), members=members)


@router.get("", response_model=list[TripOut])
async def list_trips(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cursor = db.trips.find({"members.user_id": user_id}).sort("created_at", -1)
    trips = await cursor.to_list(length=None)
    return [_trip_out(t) for t in trips]


@router.get("/{trip_id}", response_model=TripDetailOut)
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    trip = await db.trips.find_one({"_id": _oid(trip_id)})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    _require_member(trip, str(current_user["_id"]))
    members = await _resolve_members(trip)
    return TripDetailOut(**_trip_out(trip).model_dump(), members=members)


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

    members = await _resolve_members(trip)
    return TripDetailOut(**_trip_out(trip).model_dump(), members=members)
