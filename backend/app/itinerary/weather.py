"""
Per-day weather summary for a trip, via Open-Meteo (free, no API key).

Open-Meteo's forecast endpoint only covers roughly the next 16 days, but most
group trips get planned weeks or months ahead — so for anything further out
(or, degenerately, in the past) we fall back to last year's actual weather on
the same calendar dates as a "typical conditions" estimate, clearly labeled
as such rather than presented as a forecast.
"""
from datetime import date, timedelta

import httpx

from app.itinerary.schemas import DayWeather

_FORECAST_HORIZON_DAYS = 15


async def get_daily_weather(destination: str, date_list: list[str]) -> dict[str, DayWeather]:
    try:
        coords = await _geocode(destination)
        if not coords:
            return {}
        return await _fetch_weather(coords, date_list)
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return {}


async def _geocode(destination: str) -> tuple[float, float] | None:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": destination, "count": 1},
        )
        resp.raise_for_status()
        results = resp.json().get("results")
    if not results:
        return None
    return results[0]["latitude"], results[0]["longitude"]


async def _fetch_weather(coords: tuple[float, float], date_list: list[str]) -> dict[str, DayWeather]:
    lat, lon = coords
    start = date.fromisoformat(date_list[0])
    end = date.fromisoformat(date_list[-1])
    days_ahead = (start - date.today()).days
    is_historical = not (0 <= days_ahead <= _FORECAST_HORIZON_DAYS)

    if is_historical:
        url = "https://archive-api.open-meteo.com/v1/archive"
        query_start = start.replace(year=start.year - 1)
        query_end = end.replace(year=end.year - 1)
        daily_fields = "temperature_2m_max,temperature_2m_min"
    else:
        url = "https://api.open-meteo.com/v1/forecast"
        query_start, query_end = start, end
        daily_fields = "temperature_2m_max,temperature_2m_min,precipitation_probability_max"

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            url,
            params={
                "latitude": lat,
                "longitude": lon,
                "start_date": query_start.isoformat(),
                "end_date": query_end.isoformat(),
                "daily": daily_fields,
                "timezone": "auto",
            },
        )
        resp.raise_for_status()
        daily = resp.json().get("daily", {})

    result: dict[str, DayWeather] = {}
    for i, actual_date in enumerate(date_list):
        try:
            tmax = daily["temperature_2m_max"][i]
            tmin = daily["temperature_2m_min"][i]
        except (KeyError, IndexError, TypeError):
            continue
        if tmax is None or tmin is None:
            continue
        precip = None if is_historical else daily.get("precipitation_probability_max", [None] * len(date_list))[i]
        label = "Typical (based on last year)" if is_historical else "Forecast"
        result[actual_date] = DayWeather(
            summary=f"{label}: {tmin:.0f}–{tmax:.0f}°C",
            temp_min_c=tmin,
            temp_max_c=tmax,
            precipitation_chance=precip,
            is_historical_estimate=is_historical,
        )
    return result
