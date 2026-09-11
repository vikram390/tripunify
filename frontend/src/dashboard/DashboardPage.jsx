import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Navbar } from '../components/Navbar'

const emptyTripForm = {
  name: '',
  destination: '',
  start_date: '',
  end_date: '',
  budget_min: '',
  budget_max: '',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [tripForm, setTripForm] = useState(emptyTripForm)
  const [creating, setCreating] = useState(false)

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    api
      .listTrips()
      .then(setTrips)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreateTrip(e) {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const trip = await api.createTrip({
        ...tripForm,
        budget_min: Number(tripForm.budget_min),
        budget_max: Number(tripForm.budget_max),
      })
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setJoining(true)
    try {
      const trip = await api.joinTrip(joinCode.trim())
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {error && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

        <section className="grid gap-6 md:grid-cols-2">
          <form
            onSubmit={handleCreateTrip}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-800">Start a new trip</h2>
            <input
              required
              placeholder="Trip name"
              value={tripForm.name}
              onChange={(e) => setTripForm({ ...tripForm, name: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Destination"
              value={tripForm.destination}
              onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <input
                required
                type="date"
                value={tripForm.start_date}
                onChange={(e) => setTripForm({ ...tripForm, start_date: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                required
                type="date"
                value={tripForm.end_date}
                onChange={(e) => setTripForm({ ...tripForm, end_date: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <input
                required
                type="number"
                min="0"
                placeholder="Min budget"
                value={tripForm.budget_min}
                onChange={(e) => setTripForm({ ...tripForm, budget_min: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                required
                type="number"
                min="0"
                placeholder="Max budget"
                value={tripForm.budget_max}
                onChange={(e) => setTripForm({ ...tripForm, budget_max: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create trip'}
            </button>
          </form>

          <form
            onSubmit={handleJoin}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-800">Join a trip</h2>
            <p className="text-sm text-slate-500">Got an invite code from an organizer? Enter it here.</p>
            <input
              required
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
            />
            <button
              type="submit"
              disabled={joining}
              className="w-full rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {joining ? 'Joining...' : 'Join trip'}
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Your trips</h2>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : trips.length === 0 ? (
            <p className="text-slate-500">No trips yet — create one or join with a code.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-indigo-300"
                >
                  <h3 className="font-semibold text-slate-800">{trip.name}</h3>
                  <p className="text-sm text-slate-500">{trip.destination}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {trip.start_date} → {trip.end_date} · {trip.member_count} member
                    {trip.member_count === 1 ? '' : 's'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
