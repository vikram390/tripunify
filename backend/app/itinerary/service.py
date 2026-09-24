import asyncio
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.automation.stay_scraper import fetch_stay_options
from app.core.config import get_settings
from app.core.models import Itinerary, Preference, Trip
from app.core.ws_manager import manager
from app.itinerary.enrichment import enrich_days
from app.itinerary.llm_providers import get_llm_provider
from app.itinerary.prompts import build_day_regeneration_prompt, build_itinerary_prompt
from app.itinerary.schemas import DayPlan, ItineraryLLMResponse, ItineraryOut

# Gemini/OpenAI both occasionally return transient errors (rate limits, brief
# capacity overload) that are "usually temporary" per Google's own error text —
# retrying immediately rarely helps, so back off between attempts instead.
_RETRY_DELAYS_SECONDS = [2, 5]


async def _generate_with_retries(provider, prompt: str, schema):
    last_error: Exception | None = None
    for attempt in range(len(_RETRY_DELAYS_SECONDS) + 1):
        try:
            return await provider.generate_structured(prompt, schema)
        except Exception as exc:  # malformed output, rate limits, transient API errors, etc.
            last_error = exc
            if attempt < len(_RETRY_DELAYS_SECONDS):
                await asyncio.sleep(_RETRY_DELAYS_SECONDS[attempt])
    raise last_error


def _date_list(start: date, end: date) -> list[str]:
    days = (end - start).days + 1
    return [(start + timedelta(days=i)).isoformat() for i in range(days)]


def _trip_context(trip: Trip) -> dict:
    return {
        "destination": trip.destination,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "budget_min": trip.budget_min,
        "budget_max": trip.budget_max,
    }


async def _preferences_context(trip: Trip, db: AsyncSession) -> tuple[list[dict], dict[str, dict]]:
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
    return preferences_data, members_by_id


def _itinerary_out(itin: Itinerary) -> ItineraryOut:
    return ItineraryOut(
        trip_id=str(itin.trip_id),
        days=itin.days,
        conflicts=itin.conflicts,
        stay_options=itin.stay_options or [],
        generated_at=itin.generated_at,
        model=itin.model,
        status=itin.status,
    )


async def _broadcast_itinerary(out: ItineraryOut) -> None:
    await manager.broadcast(out.trip_id, {"type": "itinerary_updated", "itinerary": out.model_dump(mode="json")})


async def generate_itinerary(trip: Trip, db: AsyncSession) -> ItineraryOut:
    settings = get_settings()

    existing = await _get_itinerary_row(trip, db)
    if existing and existing.status == "finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This itinerary is finalized — reopen it before regenerating",
        )

    preferences_data, members_by_id = await _preferences_context(trip, db)
    trip_data = _trip_context(trip)
    date_list = _date_list(trip.start_date, trip.end_date)
    # Step 6 automation as a "tool" for the AI step: real, priced lodging listings
    # go into the prompt so the model picks an actual place. Empty list on failure.
    stay_options = await fetch_stay_options(trip.destination)
    prompt = build_itinerary_prompt(trip_data, preferences_data, members_by_id, date_list, stay_options)

    try:
        provider = get_llm_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    try:
        llm_result = await _generate_with_retries(provider, prompt, ItineraryLLMResponse)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"The AI itinerary generation failed, please try again. ({exc})",
        ) from exc

    enriched_days = await enrich_days(llm_result.days, trip.destination, date_list, settings.GOOGLE_PLACES_API_KEY)

    now = datetime.now(timezone.utc)
    model_name = settings.GEMINI_MODEL if settings.LLM_PROVIDER == "gemini" else settings.OPENAI_MODEL
    values = {
        "days": [d.model_dump() for d in enriched_days],
        "conflicts": [c.model_dump() for c in llm_result.conflicts],
        "stay_options": stay_options,
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
    out = _itinerary_out(result.scalar_one())
    await _broadcast_itinerary(out)
    return out


async def _get_itinerary_row(trip: Trip, db: AsyncSession) -> Itinerary | None:
    return await db.scalar(select(Itinerary).where(Itinerary.trip_id == trip.id))


async def get_itinerary(trip: Trip, db: AsyncSession) -> ItineraryOut | None:
    itin = await _get_itinerary_row(trip, db)
    return _itinerary_out(itin) if itin else None


async def set_finalized(trip: Trip, db: AsyncSession, finalized: bool) -> ItineraryOut:
    itin = await _get_itinerary_row(trip, db)
    if not itin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No itinerary exists yet")
    itin.status = "finalized" if finalized else "draft"
    await db.commit()
    out = _itinerary_out(itin)
    await _broadcast_itinerary(out)
    return out


async def regenerate_day(trip: Trip, db: AsyncSession, day_number: int, instruction: str) -> ItineraryOut:
    settings = get_settings()

    itin = await _get_itinerary_row(trip, db)
    if not itin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No itinerary exists yet")
    if itin.status == "finalized":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This itinerary is finalized — the organizer needs to reopen it before changes can be made",
        )

    current_days: list[dict] = itin.days
    target_day = next((d for d in current_days if d["day_number"] == day_number), None)
    if target_day is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Day {day_number} not found")

    preferences_data, members_by_id = await _preferences_context(trip, db)
    trip_data = _trip_context(trip)
    prompt = build_day_regeneration_prompt(
        trip_data, preferences_data, members_by_id, day_number, target_day, instruction
    )

    try:
        provider = get_llm_provider()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    try:
        new_day = await _generate_with_retries(provider, prompt, DayPlan)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not revise this day, please try again. ({exc})",
        ) from exc

    enriched = await enrich_days([new_day], trip.destination, [new_day.date], settings.GOOGLE_PLACES_API_KEY)
    updated_day = enriched[0].model_dump()
    new_days = [updated_day if d["day_number"] == day_number else d for d in current_days]
    now = datetime.now(timezone.utc)

    itin.days = new_days
    itin.generated_at = now
    await db.commit()

    out = _itinerary_out(itin)
    await _broadcast_itinerary(out)
    return out
