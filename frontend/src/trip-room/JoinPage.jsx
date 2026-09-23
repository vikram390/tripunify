import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { clearPendingInvite, setPendingInvite } from '../auth/pendingInvite'

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 text-center">
        <p className="text-red-600">{error}</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">
          Back to dashboard
        </button>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading invite...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">You're invited!</h1>

        <div className="space-y-1">
          <p className="text-lg font-semibold text-slate-800">{preview.name}</p>
          <p className="text-slate-500">{preview.destination}</p>
          <p className="text-sm text-slate-500">
            {preview.start_date} → {preview.end_date}
          </p>
        </div>

        <p className="text-sm text-slate-500">
          Organized by <span className="font-medium text-slate-700">{preview.organizer_name}</span> ·{' '}
          {preview.member_count} member{preview.member_count === 1 ? '' : 's'} so far
        </p>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => navigate('/')}
            className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Not now
          </button>
          <button
            onClick={handleJoin}
            disabled={joining}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join trip'}
          </button>
        </div>
      </div>
    </div>
  )
}
