from datetime import datetime

from pydantic import BaseModel, Field


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    ref_day_number: int | None = None


class ChatMessageOut(BaseModel):
    id: str
    trip_id: str
    user_id: str
    user_name: str
    content: str
    ref_day_number: int | None
    created_at: datetime
