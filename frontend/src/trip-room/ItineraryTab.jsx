import { useState } from 'react'
import {
  CalendarPlus,
  CloudSun,
  Download,
  Lock,
  LockOpen,
  MapPin,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react'
import { api, downloadFile } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, Badge, Button, EmptyState } from '../components/ui'
import { formatDay } from '../lib/format'

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

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading itinerary...</p>

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}

      {isOrganizer && !finalized && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {itinerary ? 'Regenerate itinerary' : 'Generate itinerary'}
                </h2>
                <p className="text-sm text-slate-500">
                  Uses everyone's submitted preferences so far to draft a day-by-day plan.
                </p>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              loading={generating}
              icon={itinerary ? RefreshCw : Wand2}
              className="w-full sm:w-auto"
            >
              {generating ? 'Generating...' : itinerary ? 'Regenerate' : 'Generate itinerary'}
            </Button>
          </div>
          {generating && (
            <p className="mt-3 text-sm text-slate-500">
              Fetching live stays, drafting the plan and matching real places — this can take up to a minute.
            </p>
          )}
        </div>
      )}

      {!itinerary && !isOrganizer && (
        <EmptyState
          icon={Sparkles}
          title="No itinerary yet"
          description="The organizer will generate the plan once everyone has shared their preferences. It will appear here instantly."
        />
      )}

      {itinerary && (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Badge tone={finalized ? 'emerald' : 'amber'}>
                {finalized ? <Lock className="size-3" /> : <Sparkles className="size-3" />}
                {finalized ? 'Finalized' : 'Draft'}
              </Badge>
              <span className="text-xs text-slate-500">{itinerary.days.length} days planned</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:flex-wrap">
              <Button variant="secondary" size="sm" icon={Download} onClick={() => handleDownload('pdf')}>
                PDF
              </Button>
              <Button variant="secondary" size="sm" icon={CalendarPlus} onClick={() => handleDownload('ics')}>
                Add to calendar
              </Button>
              {isOrganizer && (
                <Button
                  size="sm"
                  variant={finalized ? 'dark' : 'success'}
                  icon={finalized ? LockOpen : Lock}
                  loading={statusBusy}
                  onClick={() => handleStatus(finalized ? 'draft' : 'finalized')}
                  className="col-span-2"
                >
                  {statusBusy ? 'Saving...' : finalized ? 'Reopen for changes' : 'Finalize trip'}
                </Button>
              )}
            </div>
          </div>

          {itinerary.conflicts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">Where to stay</h3>
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-600 text-white">
          <span className="text-[10px] leading-none font-medium uppercase opacity-80">Day</span>
          <span className="text-base leading-tight font-bold">{day.day_number}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900">{formatDay(day.date)}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{day.summary}</p>
        </div>
      </div>
      <div className="mt-3 mb-4 flex flex-wrap items-center gap-2">
        {day.weather && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-700">
            <CloudSun className="size-3.5" /> {day.weather.summary}
          </span>
        )}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <MessageSquare className="size-3.5" /> {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </button>
        {!finalized && (
          <button
            onClick={() => setRequesting((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Wand2 className="size-3.5" /> {requesting ? 'Cancel' : 'Request a change'}
          </button>
        )}
      </div>

      {requesting && !finalized && (
        <form onSubmit={handleChangeRequest} className="mb-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row">
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. swap the hotel for something cheaper"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? 'Updating day...' : 'Send request'}
          </button>
        </form>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <ul className="space-y-4 border-l-2 border-slate-100 pl-4 sm:ml-1">
        {day.activities.map((act, i) => (
          <li key={i} className="relative">
            <span className="absolute top-1 -left-[1.42rem] size-2.5 rounded-full border-2 border-white bg-indigo-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-600">{act.time}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{act.title}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    CATEGORY_STYLES[act.category] || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {act.category}
                </span>
                {act.place_rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                    <Star className="size-3 fill-current" /> {act.place_rating}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{act.description}</p>
              {act.place_name && (
                <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-400">
                  <MapPin className="mt-px size-3 shrink-0" />
                  <span>
                    {act.place_name}
                    {act.place_description ? ` — ${act.place_description}` : ''}
                  </span>
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
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
