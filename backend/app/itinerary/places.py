"""
Real-place lookup for itinerary activities. Uses Google Places API (New) if
GOOGLE_PLACES_API_KEY is set, otherwise falls back to OpenStreetMap/Nominatim
(free, no key) per the spec. Never raises — a failed lookup just means no
enrichment for that activity, not a broken itinerary.
"""
import asyncio
from dataclasses import dataclass

import httpx

_NOMINATIM_HEADERS = {"User-Agent": "TripUnify/1.0 (final-year college project)"}


@dataclass
class PlaceInfo:
    name: str
    rating: float | None
    description: str | None


async def lookup_place(query: str, google_api_key: str) -> PlaceInfo | None:
    if google_api_key:
        try:
            info = await _google_places_lookup(query, google_api_key)
            if info:
                return info
        except httpx.HTTPError:
            pass  # fall through to the free fallback below

    try:
        return await _nominatim_lookup(query)
    except httpx.HTTPError:
        return None


async def _google_places_lookup(query: str, api_key: str) -> PlaceInfo | None:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            headers={
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": "places.displayName,places.rating,places.editorialSummary",
                "Content-Type": "application/json",
            },
            json={"textQuery": query, "maxResultCount": 1},
        )
        resp.raise_for_status()
        places = resp.json().get("places", [])

    if not places:
        return None
    place = places[0]
    return PlaceInfo(
        name=place.get("displayName", {}).get("text", query),
        rating=place.get("rating"),
        description=place.get("editorialSummary", {}).get("text"),
    )


async def _nominatim_lookup(query: str) -> PlaceInfo | None:
    async with httpx.AsyncClient(timeout=10, headers=_NOMINATIM_HEADERS) as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1},
        )
        resp.raise_for_status()
        results = resp.json()

    await asyncio.sleep(1)  # respect Nominatim's 1 req/sec usage policy

    if not results:
        return None
    display_name = results[0].get("display_name", query)
    return PlaceInfo(name=display_name.split(",")[0], rating=None, description=None)
