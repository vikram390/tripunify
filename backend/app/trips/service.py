"""Shared trip lookups used by trips, preferences, and (later) itinerary/chat routers."""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.core.db import db
from app.trips.schemas import MemberOut, TripOut


def oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")


async def get_trip_or_404(trip_id: str) -> dict:
    trip = await db.trips.find_one({"_id": oid(trip_id)})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


def require_member(trip: dict, user_id: str) -> None:
    member_ids = {m["user_id"] for m in trip["members"]}
    if user_id not in member_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this trip")


def trip_out(trip: dict) -> TripOut:
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


async def resolve_members(trip: dict) -> list[MemberOut]:
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
