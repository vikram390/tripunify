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
    """Exact shape the LLM must return — also used as the structured-output schema."""

    days: list[DayPlan]
    conflicts: list[Conflict] = Field(default_factory=list)


class ItineraryOut(BaseModel):
    trip_id: str
    days: list[DayPlan]
    conflicts: list[Conflict]
    generated_at: datetime
    model: str
    status: Literal["draft", "finalized"] = "draft"
