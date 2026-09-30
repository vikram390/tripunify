import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Field, Input } from '../components/ui'
import { useAuth } from './AuthContext'
import AuthLayout from './AuthLayout'
import PasswordInput from './PasswordInput'
import { clearPendingInvite, getPendingInvite } from './pendingInvite'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const pendingInvite = getPendingInvite()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form)
      const code = getPendingInvite()
      if (code) {
        // Hand off to JoinPage so they see what they're joining before it happens,
        // rather than joining them automatically here.
        clearPendingInvite()
        navigate(`/join/${code}`)
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Already signed in (and not mid-way through an invite) — skip straight to the app.
  if (!loading && user && !submitting && !pendingInvite) return <Navigate to="/" replace />

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to plan your next trip with the group.">
      <form onSubmit={handleSubmit} className="space-y-5">
        {pendingInvite && <Alert tone="info">Log in to join the trip you were invited to.</Alert>}
        {error && <Alert>{error}</Alert>}
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Logging in...' : 'Log in'}
        </Button>
        <p className="text-center text-sm text-slate-500">
          New to TripUnify?{' '}
          <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
