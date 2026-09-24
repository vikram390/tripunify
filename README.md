# TripUnify

AI-powered group travel planner. An organizer creates a trip, invites members, everyone
submits preferences through an in-app chat/form, and an LLM generates a live, editable,
day-wise itinerary enriched with real places/weather data.

Final-year B.Tech project. Built incrementally, feature by feature — see "Project status" below.

## Tech stack

- **Backend:** Python, FastAPI, PostgreSQL (SQLAlchemy async + Alembic migrations), JWT auth, WebSockets
- **Frontend:** React (Vite), Tailwind CSS
- **AI:** Swappable LLM provider (OpenAI or Gemini) via env var
- **Data:** Google Places API (or OpenStreetMap/Nominatim fallback), Open-Meteo (weather)
- **Automation:** Playwright — scrapes live lodging listings with prices from Wikivoyage (see backend/app/automation)
- **Export:** PDF (ReportLab) and `.ics` calendar export

## Project structure

```
/backend   FastAPI app, organized by feature (auth, trips, preferences, itinerary, chat, automation)
/frontend  React app (Vite + Tailwind)
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL running locally (or any Postgres connection string) — required starting from the
  auth/trips feature onward

## Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
playwright install chromium     # one-time: headless browser for the automation module
```

**First time only:** create your real `.env` from the template, then fill in your own
values (see `.env.example` for the full list): `DATABASE_URL` (your local Postgres
user/password), a JWT secret, your LLM provider + API key, and (optionally) a Google
Places API key.

```bash
copy .env.example .env          # Windows: copy, macOS/Linux: cp
```

⚠️ Only run that copy command once. Re-running it later **overwrites your real `.env`
with the blank template**, wiping out your saved password/API keys — if `.env` already
exists, skip straight to editing it instead.

Create the database, then create all tables by running the migrations:

```bash
# one-time: create an empty database matching the name in DATABASE_URL
psql -U postgres -c "CREATE DATABASE tripunify;"

# create/update all tables
alembic upgrade head
```

Whenever the schema changes (a new field, a new table), generate and apply a new migration:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Health check: http://localhost:8000/api/health

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — it calls the backend health check on load (proxied via Vite's
dev server config in `vite.config.js`, so no CORS setup is needed in development).

## Environment variables

All secrets live in `backend/.env` (gitignored). See [`backend/.env.example`](backend/.env.example)
for the full list and defaults. Never commit a real `.env` file.

## Project status

Built in order, one feature at a time:

- [x] Step 1 — Project scaffolding (FastAPI health check + React frontend wired together)
- [x] Step 2 — Auth & group creation (signup/login, JWT, trip creation, invite-code join)
- [x] Step 3 — Preference collection (per-member form, group submission status)
- [x] Step 4 — AI itinerary draft generation (Gemini/OpenAI-swappable, conflict flagging)
- [x] Step 5 — Live data enrichment (real place matches, per-day weather, auto-attached after generation)
- [x] Step 6 — Browser automation (Playwright scrapes real priced lodging listings; fed into the AI prompt, shown as "Where to stay")
- [x] Step 7 — Group review & real-time chat (live chat, per-day comments, "request a change" regenerates one day in place, WebSocket broadcast)
- [x] Step 8 — Export (organizer finalizes the trip; PDF and `.ics` calendar download)

The itinerary-generation prompt is isolated in its own module (`backend/app/itinerary/prompts.py`)
so it can be tuned without touching orchestration code.

## How it works (end-to-end flow)

1. Organizer signs up, creates a trip, and shares the invite link or code.
2. Invitees open the link, log in or sign up, see a trip preview, and choose **Join trip** or **Not now**.
3. Each member fills the **Preferences** tab (interests, budget comfort, date flexibility, must-see places).
4. Organizer clicks **Generate itinerary**: live lodging listings are scraped (Playwright), the AI
   drafts a day-by-day plan and flags preference conflicts, then each place is matched to real
   data and each day gets a weather summary.
5. Members discuss in **Chat**, comment on specific days, and use **Request a change** to have the
   AI rewrite a single day. Every change is pushed live to everyone over WebSockets.
6. Organizer clicks **Finalize trip** (locks edits and downloads the PDF); anyone can download the
   PDF or add the whole trip to their calendar via `.ics`. **Reopen for changes** unlocks it.

## Known limitation

AI generation depends on the Gemini API. When Gemini is overloaded it returns `503 high demand`;
the app retries with backoff (2s, then 5s) and then shows a clear "please try again" message
without touching the existing itinerary. Free-tier API keys are deprioritized first under load —
enabling billing on the Google AI Studio project avoids most of these failures.
