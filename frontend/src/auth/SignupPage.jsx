import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert, Button, Field, Input } from '../components/ui'
import { useAuth } from './AuthContext'
import AuthLayout from './AuthLayout'
import PasswordInput from './PasswordInput'
import { clearPendingInvite, getPendingInvite } from './pendingInvite'

export default function SignupPage() {
  const { user, loading, signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const pendingInvite = getPendingInvite()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signup(form)
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

  if (!loading && user && !submitting && !pendingInvite) return <Navigate to="/" replace />

  return (
    <AuthLayout title="Create your account" subtitle="It takes a few seconds — then invite your group.">
      <form onSubmit={handleSubmit} className="space-y-5">
        {pendingInvite && <Alert tone="info">Sign up to join the trip you were invited to.</Alert>}
        {error && <Alert>{error}</Alert>}
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
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
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <PasswordInput
            id="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
