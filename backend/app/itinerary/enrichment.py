"""Attaches real place matches and weather to a freshly-generated itinerary."""
from app.itinerary.places import lookup_place
from app.itinerary.schemas import DayPlan, EnrichedActivity, EnrichedDayPlan
from app.itinerary.weather import get_daily_weather


async def enrich_days(
    days: list[DayPlan], destination: str, date_list: list[str], places_api_key: str
) -> list[EnrichedDayPlan]:
    weather_by_date = await get_daily_weather(destination, date_list)

    enriched_days = []
    for day in days:
        enriched_activities = []
        for activity in day.activities:
            place_info = await lookup_place(activity.place_query, places_api_key) if activity.place_query else None
            enriched_activities.append(
                EnrichedActivity(
                    **activity.model_dump(),
                    place_name=place_info.name if place_info else None,
                    place_rating=place_info.rating if place_info else None,
                    place_description=place_info.description if place_info else None,
                )
            )
        enriched_days.append(
            EnrichedDayPlan(
                date=day.date,
                day_number=day.day_number,
                summary=day.summary,
                activities=enriched_activities,
                weather=weather_by_date.get(day.date),
            )
        )
    return enriched_days
