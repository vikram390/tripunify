import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Crown, MapPin, Plus, Ticket, Users } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, Badge, ButtonLink, EmptyState, PageHeader, Spinner } from '../components/ui'
import { coverFor, firstName, formatDateRange, tripLengthDays, tripTiming } from '../lib/format'

const FILTERS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => {
    api
      .listTrips()
      .then(setTrips)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const withTiming = trips.map((t) => ({ ...t, timing: tripTiming(t) }))
    const filtered = withTiming.filter((t) =>
      filter === 'all' ? true : filter === 'past' ? t.timing.state === 'completed' : t.timing.state !== 'completed',
    )
    // Soonest first for upcoming; most recent first for past/all.
    return filtered.sort((a, b) =>
      filter === 'upcoming' ? a.start_date.localeCompare(b.start_date) : b.start_date.localeCompare(a.start_date),
    )
  }, [trips, filter])

  const counts = useMemo(() => {
    const past = trips.filter((t) => tripTiming(t).state === 'completed').length
    return { upcoming: trips.length - past, past, all: trips.length }
  }, [trips])

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName(user?.name)} 👋`}
        description="Plan together, decide together — here are your group trips."
        action={
          <div className="hidden gap-2 sm:flex">
            <ButtonLink to="/join" variant="secondary" icon={Ticket}>
              Join a trip
            </ButtonLink>
            <ButtonLink to="/trips/new" icon={Plus}>
              New trip
            </ButtonLink>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading your trips..." />
      ) : trips.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No trips yet"
          description="Start a trip and invite your friends, or join one with the invite code or link an organizer shared with you."
        >
          <ButtonLink to="/trips/new" icon={Plus}>
            Create a trip
          </ButtonLink>
          <ButtonLink to="/join" variant="secondary" icon={Ticket}>
            Join with a code
          </ButtonLink>
        </EmptyState>
      ) : (
        <>
          <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
                <span className={`text-xs ${filter === f.id ? 'text-slate-300' : 'text-slate-400'}`}>{counts[f.id]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={filter === 'past' ? 'No past trips yet' : 'Nothing coming up'}
              description={
                filter === 'past' ? 'Trips you have finished will show up here.' : 'Plan your next getaway with the group.'
              }
            >
              {filter !== 'past' && (
                <ButtonLink to="/trips/new" icon={Plus}>
                  New trip
                </ButtonLink>
              )}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((trip) => (
                <TripCard key={trip.id} trip={trip} isOrganizer={trip.organizer_id === user?.id} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

function TripCard({ trip, isOrganizer }) {
  const { timing } = trip
  const days = tripLengthDays(trip.start_date, trip.end_date)

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className={`relative h-24 bg-gradient-to-br ${coverFor(trip.id)} p-4`}>
        <MapPin className="absolute -right-3 -bottom-4 size-24 text-white/15" />
        <div className="flex items-start justify-between gap-2">
          <Badge tone="light">{timing.label}</Badge>
          {isOrganizer && (
            <Badge tone="glass">
              <Crown className="size-3" /> Organizer
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-indigo-700">{trip.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-500">
          <MapPin className="size-3.5 shrink-0" /> {trip.destination}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatDateRange(trip.start_date, trip.end_date)}
            <span className="text-slate-400">· {days}d</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {trip.member_count}
          </span>
        </div>
      </div>
    </Link>
  )
}
