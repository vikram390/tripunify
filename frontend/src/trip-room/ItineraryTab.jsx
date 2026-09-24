import { useState } from 'react'
import { api, downloadFile } from '../api/client'
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

export default function ItineraryTab({ trip, itinerary, loading, onItineraryChange, messages, onSendMessage }) {
  const { user } = useAuth()
  const isOrganizer = trip.organizer_id === user?.id
  const finalized = itinerary?.status === 'finalized'
  const [generating, setGenerating] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
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

  async function handleDownload(kind) {
    setError('')
    try {
      await downloadFile(`/trips/${trip.id}/itinerary/export.${kind}`, `itinerary.${kind}`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleStatus(nextStatus) {
    setError('')
    setStatusBusy(true)
    try {
      onItineraryChange(await api.setItineraryStatus(trip.id, nextStatus))
      if (nextStatus === 'finalized') await handleDownload('pdf')
    } catch (err) {
      setError(err.message)
    } finally {
      setStatusBusy(false)
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      {isOrganizer && !finalized && (
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
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                finalized ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {finalized ? 'Finalized' : 'Draft'}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={() => handleDownload('pdf')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Download PDF
              </button>
              <button
                onClick={() => handleDownload('ics')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Add to calendar (.ics)
              </button>
              {isOrganizer && (
                <button
                  onClick={() => handleStatus(finalized ? 'draft' : 'finalized')}
                  disabled={statusBusy}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 ${
                    finalized ? 'bg-slate-700 hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {statusBusy ? 'Saving...' : finalized ? 'Reopen for changes' : 'Finalize trip'}
                </button>
              )}
            </div>
          </div>

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

          <StayOptions key={itinerary.generated_at} tripId={trip.id} initial={itinerary.stay_options} />

          <div className="space-y-4">
            {itinerary.days.map((day) => (
              <DayCard
                key={day.day_number}
                tripId={trip.id}
                day={day}
                finalized={finalized}
                comments={messages.filter((m) => m.ref_day_number === day.day_number)}
                onSendMessage={onSendMessage}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StayOptions({ tripId, initial }) {
  const [options, setOptions] = useState(initial)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    try {
      setOptions(await api.getStayOptions(tripId, true))
    } catch {
      // keep showing the previous listings if the live fetch fails
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-800">Where to stay</h3>
        <button onClick={handleRefresh} disabled={refreshing} className="text-xs text-indigo-600 hover:underline">
          {refreshing ? 'Fetching live listings...' : 'Refresh live listings'}
        </button>
      </div>
      {options.length === 0 ? (
        <p className="text-sm text-slate-400">No live listings available for this destination right now.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {options.map((o) => (
              <li key={o.name} className="py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">{o.name}</span>
                  <span className="shrink-0 text-sm text-emerald-700">{o.price || 'price not listed'}</span>
                </div>
                {o.description && <p className="text-xs text-slate-500">{o.description}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            Live via browser automation from{' '}
            <a href={options[0].source_url} target="_blank" rel="noreferrer" className="underline">
              Wikivoyage
            </a>
          </p>
        </>
      )}
    </div>
  )
}

function DayCard({ tripId, day, finalized, comments, onSendMessage }) {
  const [requesting, setRequesting] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  async function handleChangeRequest(e) {
    e.preventDefault()
    if (!instruction.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await api.regenerateDay(tripId, day.day_number, instruction.trim())
      setInstruction('')
      setRequesting(false)
      // The updated itinerary arrives via the WebSocket broadcast wired in TripRoomPage.
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    const content = comment.trim()
    if (!content) return
    setComment('')
    setError('')
    try {
      await onSendMessage(content, day.day_number)
    } catch (err) {
      setError(err.message)
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
            onClick={() => setShowComments((v) => !v)}
            className="text-xs font-medium text-slate-600 hover:underline"
          >
            💬 {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </button>
          {!finalized && (
            <button
              onClick={() => setRequesting((v) => !v)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              {requesting ? 'Cancel' : 'Request a change'}
            </button>
          )}
        </div>
      </div>
      <p className="mb-4 mt-1 text-sm text-slate-500">{day.summary}</p>

      {requesting && !finalized && (
        <form onSubmit={handleChangeRequest} className="mb-4 flex gap-2 rounded-md bg-slate-50 p-3">
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
            {submitting ? 'Updating day...' : 'Send request'}
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

      {showComments && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {comments.length === 0 && <p className="text-xs text-slate-400">No comments on this day yet.</p>}
          {comments.map((m) => (
            <p key={m.id} className="text-sm text-slate-700">
              <span className="font-medium">{m.user_name}:</span> {m.content}
            </p>
          ))}
          <form onSubmit={handleComment} className="flex gap-2 pt-1">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Comment on Day ${day.day_number}...`}
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
