import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Navbar } from '../components/Navbar'

export default function TripRoomPage() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.getTrip(tripId).then(setTrip).catch((err) => setError(err.message))
  }, [tripId])

  function copyInviteLink() {
    const link = `${window.location.origin}/join/${trip.invite_code}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>
  if (!trip) return <div className="p-8 text-center text-slate-500">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">{trip.name}</h1>
          <p className="text-slate-500">{trip.destination}</p>
          <p className="mt-2 text-sm text-slate-500">
            {trip.start_date} → {trip.end_date} · Budget: {trip.budget_min}–{trip.budget_max}
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-md bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Invite code</span>
            <span className="font-mono text-lg font-semibold tracking-wider text-slate-800">
              {trip.invite_code}
            </span>
            <button
              onClick={copyInviteLink}
              className="ml-auto rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-white"
            >
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Members ({trip.members.length})</h2>
          <ul className="divide-y divide-slate-100">
            {trip.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                {m.is_organizer && (
                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600">
                    Organizer
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
