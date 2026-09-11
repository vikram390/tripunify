from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Interest = Literal["adventure", "food", "culture", "relaxation", "nightlife"]
BudgetComfort = Literal["budget", "moderate", "luxury"]
DateFlexibility = Literal["fixed", "flexible_few_days", "very_flexible"]


class PreferencesUpsertRequest(BaseModel):
    interests: list[Interest] = Field(min_length=1)
    budget_comfort: BudgetComfort
    date_flexibility: DateFlexibility
    must_see: str = Field(default="", max_length=500)


class PreferencesOut(BaseModel):
    interests: list[Interest]
    budget_comfort: BudgetComfort
    date_flexibility: DateFlexibility
    must_see: str
    submitted_at: datetime


class MemberStatusOut(BaseModel):
    user_id: str
    name: str
    submitted: bool


class PreferencesStatusOut(BaseModel):
    total_members: int
    submitted_count: int
    all_submitted: bool
    members: list[MemberStatusOut]
