from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.models import Itinerary, Preference, Trip
from app.itinerary.enrichment import enrich_days
from app.itinerary.llm_providers import get_llm_provider
from app.itinerary.prompts import build_itinerary_prompt
from app.itinerary.schemas import ItineraryLLMResponse, ItineraryOut


def _date_list(start: date, end: date) -> list[str]:
    days = (end - start).days + 1
    return [(start + timedelta(days=i)).isoformat() for i in range(days)]


async def generate_itinerary(trip: Trip, db: AsyncSession) -> ItineraryOut:
    settings = get_settings()

    result = await db.execute(select(Preference).where(Preference.trip_id == trip.id))
    preferences = result.scalars().all()
    preferences_data = [
        {
            "user_id": str(p.user_id),
            "interests": p.interests,
            "budget_comfort": p.budget_comfort,
            "date_flexibility": p.date_flexibility,
            "must_see": p.must_see,
        }
        for p in preferences
    ]
    members_by_id = {str(m.user_id): {"name": m.user.name} for m in trip.members}

    trip_data = {
        "destination": trip.destination,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "budget_min": trip.budget_min,
        "budget_max": trip.budget_max,
    }
    date_list = _date_list(trip.start_date, trip.end_date)
    prompt = build_itinerary_prompt(trip_data, preferences_data, members_by_id, date_list)

    try:
        provider = get_llm_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    llm_result = None
    last_error: Exception | None = None
    for _ in range(2):
        try:
            llm_result = await provider.generate_structured(prompt, ItineraryLLMResponse)
            break
        except (ValidationError, ValueError) as exc:
            last_error = exc
    if llm_result is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"The AI itinerary generation failed, please try again. ({last_error})",
        )

    enriched_days = await enrich_days(llm_result.days, trip.destination, date_list, settings.GOOGLE_PLACES_API_KEY)

    now = datetime.now(timezone.utc)
    model_name = settings.GEMINI_MODEL if settings.LLM_PROVIDER == "gemini" else settings.OPENAI_MODEL
    values = {
        "days": [d.model_dump() for d in enriched_days],
        "conflicts": [c.model_dump() for c in llm_result.conflicts],
        "generated_at": now,
        "model": model_name,
        "status": "draft",
    }
    stmt = (
        pg_insert(Itinerary)
        .values(trip_id=trip.id, **values)
        .on_conflict_do_update(index_elements=["trip_id"], set_=values)
        .returning(Itinerary)
    )
    result = await db.execute(stmt)
    await db.commit()
    itin = result.scalar_one()
    return ItineraryOut(
        trip_id=str(itin.trip_id),
        days=itin.days,
        conflicts=itin.conflicts,
        generated_at=itin.generated_at,
        model=itin.model,
        status=itin.status,
    )


async def get_itinerary(trip: Trip, db: AsyncSession) -> ItineraryOut | None:
    itin = await db.scalar(select(Itinerary).where(Itinerary.trip_id == trip.id))
    if not itin:
        return None
    return ItineraryOut(
        trip_id=str(itin.trip_id),
        days=itin.days,
        conflicts=itin.conflicts,
        generated_at=itin.generated_at,
        model=itin.model,
        status=itin.status,
    )
