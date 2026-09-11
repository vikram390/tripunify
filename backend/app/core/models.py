"""SQLAlchemy ORM models — the relational schema for the whole app."""
import uuid
from datetime import date as date_type, datetime, timezone

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    destination: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[date_type]
    end_date: Mapped[date_type]
    budget_min: Mapped[float]
    budget_max: Mapped[float]
    organizer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)

    members: Mapped[list["TripMember"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan"
    )


class TripMember(Base):
    __tablename__ = "trip_members"
    __table_args__ = (UniqueConstraint("trip_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trips.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    joined_at: Mapped[datetime] = mapped_column(default=_utcnow)

    trip: Mapped["Trip"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()


class Preference(Base):
    __tablename__ = "preferences"
    __table_args__ = (UniqueConstraint("trip_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trips.id"))
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    interests: Mapped[list[str]] = mapped_column(ARRAY(String))
    budget_comfort: Mapped[str] = mapped_column(String(20))
    date_flexibility: Mapped[str] = mapped_column(String(30))
    must_see: Mapped[str] = mapped_column(Text, default="")
    submitted_at: Mapped[datetime] = mapped_column(default=_utcnow)


class Itinerary(Base):
    __tablename__ = "itineraries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("trips.id"), unique=True)
    days: Mapped[list[dict]] = mapped_column(JSONB)
    conflicts: Mapped[list[dict]] = mapped_column(JSONB)
    generated_at: Mapped[datetime] = mapped_column(default=_utcnow)
    model: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="draft")
