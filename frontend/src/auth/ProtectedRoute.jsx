import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
