import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { clearPendingInvite, setPendingInvite } from '../auth/pendingInvite'

export default function JoinPage() {
  const { code } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return

    if (!user) {
      setPendingInvite(code)
      navigate('/login')
      return
    }

    api
      .joinTrip(code)
      .then((trip) => {
        clearPendingInvite()
        navigate(`/trips/${trip.id}`)
      })
      .catch((err) => setError(err.message))
  }, [loading, user, code, navigate])

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
      Joining trip...
    </div>
  )
}
