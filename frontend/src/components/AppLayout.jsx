import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Map, PlusCircle, Ticket, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Logo } from './Logo'
import { Avatar } from './ui'

const NAV_ITEMS = [
  { to: '/', label: 'My trips', short: 'Trips', icon: Map, end: true },
  { to: '/trips/new', label: 'New trip', short: 'New', icon: PlusCircle },
  { to: '/join', label: 'Join trip', short: 'Join', icon: Ticket },
  { to: '/profile', label: 'Profile', short: 'Profile', icon: UserRound },
]

// A trip room (/trips/<id>) still belongs under "My trips" in the nav.
function isTripsSection(pathname) {
  return pathname === '/' || (pathname.startsWith('/trips/') && pathname !== '/trips/new')
}

function useNavActive() {
  const { pathname } = useLocation()
  return (item) => (item.to === '/' ? isTripsSection(pathname) : pathname.startsWith(item.to))
}

export default function AppLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh bg-slate-50">
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 md:pb-12">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

function TopBar() {
  const isActive = useNavActive()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="TripUnify home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_ITEMS.filter((item) => item.to !== '/profile').map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <UserMenu />
      </div>
    </header>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onPointer(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  function handleLogout() {
    setOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <div className="relative" ref={ref}>
      {/* On phones the avatar goes straight to the profile (the bottom bar covers the rest). */}
      <Link to="/profile" className="md:hidden" aria-label="Your profile">
        <Avatar name={user.name} seed={user.id} size="sm" />
      </Link>

      <button
        onClick={() => setOpen((v) => !v)}
        className="hidden items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm font-medium text-slate-700 hover:bg-slate-100 md:flex"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name} seed={user.id} size="sm" />
        <span className="max-w-[10rem] truncate">{user.name}</span>
        <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="p-1">
            <Link
              to="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <UserRound className="size-4 text-slate-400" /> Profile & settings
            </Link>
            <button
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BottomNav() {
  const isActive = useNavActive()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? 'bg-indigo-50' : ''}`}>
                <item.icon className="size-5" />
              </span>
              {item.short}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
