import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Link2, Ticket } from 'lucide-react'
import { api } from '../api/client'
import { Alert, Button, Card, Field, Input, PageHeader } from '../components/ui'

export default function JoinTripPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setJoining(true)
    try {
      const trip = await api.joinTrip(code.trim())
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      setError(err.message)
      setJoining(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> My trips
      </Link>
      <PageHeader title="Join a trip" description="Got an invite from an organizer? Paste it below." />

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleJoin} className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <Field label="Invite code or link" htmlFor="code" hint="Both work — e.g. 24L263F or the full link the organizer copied.">
            <div className="relative">
              <Ticket className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="code"
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Invite code or link"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="pl-9 font-mono tracking-wide"
              />
            </div>
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={joining}>
            {joining ? 'Joining...' : 'Join trip'}
          </Button>
        </form>
      </Card>

      <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-600">
        <Link2 className="mt-0.5 size-5 shrink-0 text-indigo-500" />
        <p>
          Opening an invite link directly also works — you'll see a preview of the trip and can choose to join or skip.
        </p>
      </div>
    </div>
  )
}
