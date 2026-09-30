import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, MapPin, PartyPopper, TicketX, Users } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { clearPendingInvite, setPendingInvite } from '../auth/pendingInvite'
import { Logo } from '../components/Logo'
import { Button, ButtonLink, Spinner } from '../components/ui'
import { formatDateRange } from '../lib/format'

export default function JoinPage() {
  const { code } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (loading) return

    if (!user) {
      setPendingInvite(code)
      navigate('/login')
      return
    }

    api
      .previewTrip(code)
      .then((data) => {
        if (data.already_member) {
          // Already part of this trip — no need to ask, just take them there.
          clearPendingInvite()
          navigate(`/trips/${data.id}`)
          return
        }
        setPreview(data)
      })
      .catch((err) => setError(err.message))
  }, [loading, user, code, navigate])

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      const trip = await api.joinTrip(code)
      clearPendingInvite()
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      setError(err.message)
      setJoining(false)
    }
  }

  if (error) {
    return (
      <InviteShell>
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <TicketX className="size-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">This invite doesn't work</h1>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <ButtonLink to="/" variant="secondary" className="mt-6 w-full">
          Go to my trips
        </ButtonLink>
      </InviteShell>
    )
  }

  if (!preview) {
    return (
      <InviteShell>
        <Spinner label="Loading invite..." />
      </InviteShell>
    )
  }

  return (
    <InviteShell>
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <PartyPopper className="size-6" />
      </div>
      <p className="text-sm font-medium text-indigo-600">You're invited!</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight break-words text-slate-900">{preview.name}</h1>

      <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
        <p className="flex items-center gap-2 text-slate-700">
          <MapPin className="size-4 shrink-0 text-slate-400" /> {preview.destination}
        </p>
        <p className="flex items-center gap-2 text-slate-700">
          <CalendarDays className="size-4 shrink-0 text-slate-400" /> {formatDateRange(preview.start_date, preview.end_date)}
        </p>
        <p className="flex items-center gap-2 text-slate-700">
          <Users className="size-4 shrink-0 text-slate-400" />
          Organized by <span className="font-medium">{preview.organizer_name}</span> · {preview.member_count}{' '}
          {preview.member_count === 1 ? 'member' : 'members'}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => navigate('/')}>
          Not now
        </Button>
        <Button onClick={handleJoin} loading={joining}>
          {joining ? 'Joining...' : 'Join trip'}
        </Button>
      </div>
    </InviteShell>
  )
}

function InviteShell({ children }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-lg shadow-indigo-500/5 sm:p-8">
        {children}
      </div>
    </div>
  )
}
