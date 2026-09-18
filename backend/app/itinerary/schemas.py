from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ActivityCategory = Literal[
    "food", "attraction", "adventure", "culture", "relaxation", "nightlife", "logistics"
]


class Activity(BaseModel):
    time: str = Field(description="24-hour time, e.g. '09:00'")
    title: str
    description: str
    category: ActivityCategory
    place_query: str | None = Field(
        default=None,
        description="Specific, searchable place name for lookup (e.g. 'Baga Beach Goa'). "
        "Omit for non-place items like transfers or check-in.",
    )
    duration_minutes: int = 60


class DayPlan(BaseModel):
    date: str
    day_number: int
    summary: str
    activities: list[Activity]


class Conflict(BaseModel):
    members: list[str]
    note: str


class ItineraryLLMResponse(BaseModel):
    """Exact shape the LLM must return — also used as the structured-output schema.

    Deliberately has no rating/weather fields: those come from real APIs in the
    enrichment step (app/itinerary/enrichment.py), never from the model itself.
    """

    days: list[DayPlan]
    conflicts: list[Conflict] = Field(default_factory=list)


class EnrichedActivity(Activity):
    """An Activity plus a real place match, added after the LLM call."""

    place_name: str | None = None
    place_rating: float | None = None
    place_description: str | None = None


class DayWeather(BaseModel):
    summary: str
    temp_min_c: float | None = None
    temp_max_c: float | None = None
    precipitation_chance: int | None = None
    is_historical_estimate: bool = False


class EnrichedDayPlan(DayPlan):
    activities: list[EnrichedActivity]
    weather: DayWeather | None = None


class ItineraryOut(BaseModel):
    trip_id: str
    days: list[EnrichedDayPlan]
    conflicts: list[Conflict]
    generated_at: datetime
    model: str
    status: Literal["draft", "finalized"] = "draft"


class DayRegenerateRequest(BaseModel):
    instruction: str = Field(min_length=1, max_length=500, description="e.g. 'swap the hotel for something cheaper'")
