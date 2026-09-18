import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const CATEGORY_STYLES = {
  food: 'bg-orange-50 text-orange-700',
  attraction: 'bg-blue-50 text-blue-700',
  adventure: 'bg-emerald-50 text-emerald-700',
  culture: 'bg-purple-50 text-purple-700',
  relaxation: 'bg-teal-50 text-teal-700',
  nightlife: 'bg-pink-50 text-pink-700',
  logistics: 'bg-slate-100 text-slate-600',
}

export default function ItineraryTab({ trip, itinerary, loading, onItineraryChange }) {
  const { user } = useAuth()
  const isOrganizer = trip.organizer_id === user?.id
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      onItineraryChange(await api.generateItinerary(trip.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      {isOrganizer && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {itinerary ? 'Regenerate itinerary' : 'Generate itinerary'}
              </h2>
              <p className="text-sm text-slate-500">
                Uses everyone's submitted preferences so far to draft a day-by-day plan.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="whitespace-nowrap rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {generating ? 'Generating...' : itinerary ? 'Regenerate' : 'Generate itinerary'}
            </button>
          </div>
          {generating && <p className="mt-3 text-sm text-slate-400">This can take up to a minute...</p>}
        </div>
      )}

      {!itinerary && !isOrganizer && (
        <p className="text-slate-500">The organizer hasn't generated the itinerary yet.</p>
      )}

      {itinerary && (
        <>
          {itinerary.conflicts.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <h3 className="mb-2 text-sm font-semibold text-amber-800">Needs group input</h3>
              <ul className="space-y-2">
                {itinerary.conflicts.map((c, i) => (
                  <li key={i} className="text-sm text-amber-800">
                    <span className="font-medium">{c.members.join(' & ')}:</span> {c.note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {itinerary.days.map((day) => (
              <DayCard key={day.day_number} tripId={trip.id} day={day} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DayCard({ tripId, day }) {
  const [requesting, setRequesting] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!instruction.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api.regenerateDay(tripId, day.day_number, instruction.trim())
      setInstruction('')
      setRequesting(false)
      // The updated itinerary arrives via the WebSocket broadcast (onItineraryChange
      // is wired to it in TripRoomPage), so no need to apply the response here too.
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-800">
          Day {day.day_number} · {day.date}
        </h3>
        <div className="flex items-center gap-3">
          {day.weather && <span className="text-xs text-slate-500">{day.weather.summary}</span>}
          <button
            onClick={() => setRequesting((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            {requesting ? 'Cancel' : 'Request a change'}
          </button>
        </div>
      </div>
      <p className="mb-4 mt-1 text-sm text-slate-500">{day.summary}</p>

      {requesting && (
        <form onSubmit={handleSubmit} className="mb-4 flex gap-2 rounded-md bg-slate-50 p-3">
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. swap the hotel for something cheaper"
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={submitting}
            className="whitespace-nowrap rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send request'}
          </button>
        </form>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <ul className="space-y-3">
        {day.activities.map((act, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-14 shrink-0 font-mono text-sm text-slate-400">{act.time}</span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{act.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    CATEGORY_STYLES[act.category] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {act.category}
                </span>
                {act.place_rating != null && <span className="text-xs text-amber-600">★ {act.place_rating}</span>}
              </div>
              <p className="text-sm text-slate-500">{act.description}</p>
              {act.place_name && (
                <p className="mt-0.5 text-xs text-slate-400">
                  📍 {act.place_name}
                  {act.place_description ? ` — ${act.place_description}` : ''}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
