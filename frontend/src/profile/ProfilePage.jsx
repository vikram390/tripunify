import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  Map,
  UserRound,
  Users,
} from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, Avatar, Button, Card, CardHeader, Field, Input, Spinner } from '../components/ui'
import { formatDateRange, formatMonthYear, tripTiming } from '../lib/format'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [trips, setTrips] = useState(null)

  useEffect(() => {
    api
      .listTrips()
      .then(setTrips)
      .catch(() => setTrips([]))
  }, [])

  const stats = useMemo(() => {
    if (!trips) return null
    const organizing = trips.filter((t) => t.organizer_id === user.id).length
    const upcoming = trips.filter((t) => tripTiming(t).state !== 'completed')
    return {
      total: trips.length,
      organizing,
      joined: trips.length - organizing,
      upcomingCount: upcoming.length,
      next: [...upcoming].sort((a, b) => a.start_date.localeCompare(b.start_date))[0],
    }
  }, [trips, user.id])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 sm:h-28" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <Avatar name={user.name} seed={user.id} size="xl" className="-mt-10 ring-4 ring-white" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{user.name}</h1>
              <p className="flex items-center gap-1.5 truncate text-sm text-slate-500">
                <Mail className="size-4 shrink-0" /> {user.email}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Member since {formatMonthYear(user.created_at)}</p>
            </div>
          </div>
          <Button variant="danger" icon={LogOut} onClick={handleLogout} className="self-start sm:self-auto">
            Log out
          </Button>
        </div>
      </Card>

      {!stats ? (
        <Spinner label="Loading your stats..." />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Map} label="Total trips" value={stats.total} />
          <Stat icon={CalendarClock} label="Upcoming" value={stats.upcomingCount} />
          <Stat icon={Crown} label="Organizing" value={stats.organizing} />
          <Stat icon={Users} label="Joined" value={stats.joined} />
        </div>
      )}

      {stats?.next && (
        <Link
          to={`/trips/${stats.next.id}`}
          className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 transition hover:border-indigo-200 hover:bg-indigo-50"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <CalendarCheck className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium tracking-wide text-indigo-600 uppercase">Next trip · {tripTiming(stats.next).label}</p>
            <p className="truncate font-semibold text-slate-900">{stats.next.name}</p>
            <p className="truncate text-sm text-slate-500">
              {stats.next.destination} · {formatDateRange(stats.next.start_date, stats.next.end_date)}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-indigo-400" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AccountDetails />
        <ChangePassword />
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </Card>
  )
}

function AccountDetails() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const dirty = name.trim() !== user.name && name.trim().length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await updateProfile({ name: name.trim() })
      setMessage({ tone: 'success', text: 'Your name has been updated.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader icon={UserRound} title="Account details" description="This is how other members see you in trips and chat." />
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <Field label="Display name" htmlFor="profile-name">
          <Input id="profile-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="profile-email" hint="Your email is your login and can't be changed.">
          <Input id="profile-email" value={user.email} disabled />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!dirty} className="w-full sm:w-auto">
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  )
}

const emptyPasswords = { current_password: '', new_password: '', confirm: '' }

function ChangePassword() {
  const { changePassword } = useAuth()
  const [form, setForm] = useState(emptyPasswords)
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const mismatch = form.confirm.length > 0 && form.confirm !== form.new_password
  const tooShort = form.new_password.length > 0 && form.new_password.length < 8

  async function handleSubmit(e) {
    e.preventDefault()
    if (mismatch || tooShort) return
    setSaving(true)
    setMessage(null)
    try {
      await changePassword({ current_password: form.current_password, new_password: form.new_password })
      setForm(emptyPasswords)
      setMessage({ tone: 'success', text: 'Password changed. Use the new one next time you log in.' })
    } catch (err) {
      setMessage({ tone: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const type = show ? 'text' : 'password'

  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        icon={KeyRound}
        title="Change password"
        description="Use at least 8 characters."
        action={
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="flex items-center gap-1 self-start text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {show ? 'Hide' : 'Show'}
          </button>
        }
      />
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <Field label="Current password" htmlFor="current_password">
          <Input id="current_password" type={type} required autoComplete="current-password" value={form.current_password} onChange={set('current_password')} />
        </Field>
        <Field label="New password" htmlFor="new_password" error={tooShort ? 'Must be at least 8 characters.' : null}>
          <Input id="new_password" type={type} required minLength={8} maxLength={72} autoComplete="new-password" value={form.new_password} onChange={set('new_password')} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" error={mismatch ? "Passwords don't match." : null}>
          <Input id="confirm" type={type} required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="dark" loading={saving} disabled={mismatch || tooShort} className="w-full sm:w-auto">
            Update password
          </Button>
        </div>
      </form>
    </Card>
  )
}
