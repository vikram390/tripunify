import { useEffect, useState } from 'react'
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

export default function ItineraryTab({ trip }) {
  const { user } = useAuth()
  const isOrganizer = trip.organizer_id === user?.id
  const [itinerary, setItinerary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getItinerary(trip.id)
      .then(setItinerary)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [trip.id])

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      setItinerary(await api.generateItinerary(trip.id))
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
          {generating && <p className="mt-3 text-sm text-slate-400">This can take up to 30 seconds...</p>}
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
              <div key={day.day_number} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800">
                  Day {day.day_number} · {day.date}
                </h3>
                <p className="mb-4 mt-1 text-sm text-slate-500">{day.summary}</p>
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
                        </div>
                        <p className="text-sm text-slate-500">{act.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
