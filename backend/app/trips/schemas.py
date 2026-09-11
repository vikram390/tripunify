from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class TripCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    destination: str = Field(min_length=1, max_length=200)
    start_date: date
    end_date: date
    budget_min: float = Field(ge=0)
    budget_max: float = Field(ge=0)

    @model_validator(mode="after")
    def check_ranges(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if self.budget_max < self.budget_min:
            raise ValueError("budget_max must be >= budget_min")
        return self


class JoinTripRequest(BaseModel):
    invite_code: str = Field(min_length=1, max_length=32)


class MemberOut(BaseModel):
    id: str
    name: str
    email: str
    is_organizer: bool
    joined_at: datetime


class TripOut(BaseModel):
    id: str
    name: str
    destination: str
    start_date: date
    end_date: date
    budget_min: float
    budget_max: float
    invite_code: str
    organizer_id: str
    member_count: int
    created_at: datetime


class TripDetailOut(TripOut):
    members: list[MemberOut]
