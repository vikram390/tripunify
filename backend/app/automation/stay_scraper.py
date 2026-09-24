"""
Step 6 — the one scoped browser-automation flow.

Uses Playwright (headless Chromium) to open the destination's Wikivoyage page
and read real lodging listings (name, price, description) from its "Sleep"
section. Wikivoyage was chosen deliberately: it permits automated access and
carries real price ranges, whereas the big OTAs (MakeMyTrip, Booking.com,
etc.) actively block headless browsers. Wikivoyage has no star ratings, so
`rating` is always None rather than invented.

Never raises: any failure (timeout, missing page, changed markup, Playwright
not installed) returns an empty list so itinerary generation carries on.
"""
import asyncio
import sys
import time
from dataclasses import asdict, dataclass
from urllib.parse import quote

_PAGE_TIMEOUT_MS = 15_000
_OVERALL_TIMEOUT_S = 25
_CACHE_TTL_S = 60 * 60
_MAX_RESULTS = 6

_cache: dict[str, tuple[float, list[dict]]] = {}

# Walk from the "Sleep" heading to the next top-level heading and collect the
# listing cards in between. Listings with a price come first.
_EXTRACT_JS = """
() => {
  const anchor = document.getElementById('Sleep');
  if (!anchor) return [];
  let node = anchor.closest('.mw-heading2') || anchor.closest('h2') || anchor;
  const cards = [];
  node = node.nextElementSibling;
  while (node && !(node.matches('.mw-heading2, h2'))) {
    if (node.matches('.vcard')) cards.push(node);
    cards.push(...node.querySelectorAll('.vcard'));
    node = node.nextElementSibling;
  }
  return cards.map(c => {
    const name = (c.querySelector('.listing-name .fn, .fn, .listing-name')?.innerText || '').trim();
    const price = (c.querySelector('.listing-price')?.innerText || '').trim();
    const content = (c.querySelector('.listing-content')?.innerText || '').trim();
    return { name, price, description: content };
  }).filter(x => x.name);
}
"""


@dataclass
class StayOption:
    name: str
    price: str | None
    description: str | None
    rating: float | None
    source_url: str


def _wikivoyage_url(destination: str) -> str:
    # "Manali, Himachal Pradesh" -> "Manali"
    place = destination.split(",")[0].strip().replace(" ", "_")
    return f"https://en.wikivoyage.org/wiki/{quote(place)}"


async def _scrape(url: str) -> list[dict]:
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.goto(url, timeout=_PAGE_TIMEOUT_MS, wait_until="domcontentloaded")
            raw = await page.evaluate(_EXTRACT_JS)
        finally:
            await browser.close()

    seen: set[str] = set()
    options = []
    for item in sorted(raw, key=lambda x: not x["price"]):
        if item["name"] in seen:
            continue
        seen.add(item["name"])
        description = item["description"][:200] or None
        options.append(
            asdict(StayOption(item["name"], item["price"] or None, description, None, url))
        )
        if len(options) >= _MAX_RESULTS:
            break
    return options


def _run_in_own_loop(url: str) -> list[dict]:
    # Playwright launches a browser subprocess, which needs a Proactor event loop
    # on Windows; uvicorn's loop there is a Selector loop, so run on a fresh loop
    # in a worker thread instead of the request's loop.
    loop = asyncio.ProactorEventLoop() if sys.platform == "win32" else asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_scrape(url))
    finally:
        loop.close()


async def fetch_stay_options(destination: str, use_cache: bool = True) -> list[dict]:
    url = _wikivoyage_url(destination)
    cached = _cache.get(url)
    if use_cache and cached and time.time() - cached[0] < _CACHE_TTL_S:
        return cached[1]
    try:
        options = await asyncio.wait_for(asyncio.to_thread(_run_in_own_loop, url), _OVERALL_TIMEOUT_S)
    except Exception:
        return []
    if options:
        _cache[url] = (time.time(), options)
    return options
