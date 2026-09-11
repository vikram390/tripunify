import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-slate-800">
          TripUnify
        </Link>
        {user && (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{user.name}</span>
            <button
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
