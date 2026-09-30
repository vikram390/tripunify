import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Sparkles, Wallet } from 'lucide-react'
import { api } from '../api/client'
import { Alert, Button, ButtonLink, Card, Field, Input, PageHeader } from '../components/ui'
import { formatBudget, tripLengthDays } from '../lib/format'

const emptyForm = { name: '', destination: '', start_date: '', end_date: '', budget_min: '', budget_max: '' }

function todayIso() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function NewTripPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const datesValid = form.start_date && form.end_date && form.end_date >= form.start_date
  const budgetValid =
    form.budget_min !== '' && form.budget_max !== '' && Number(form.budget_max) >= Number(form.budget_min)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!datesValid) return setError('The end date needs to be on or after the start date.')
    if (!budgetValid) return setError('The maximum budget needs to be at least the minimum budget.')
    setCreating(true)
    try {
      const trip = await api.createTrip({
        ...form,
        name: form.name.trim(),
        destination: form.destination.trim(),
        budget_min: Number(form.budget_min),
        budget_max: Number(form.budget_max),
      })
      navigate(`/trips/${trip.id}`)
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> My trips
      </Link>
      <PageHeader title="Start a new trip" description="Set the basics — you'll invite your group on the next screen." />

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert>{error}</Alert>}

          <Field label="Trip name" htmlFor="name">
            <Input id="name" required maxLength={200} placeholder="e.g. Goa with college friends" value={form.name} onChange={set('name')} />
          </Field>

          <Field label="Destination" htmlFor="destination" hint="A city or region works best, e.g. Goa, Manali, Jaipur.">
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input id="destination" required maxLength={200} placeholder="Where are you going?" value={form.destination} onChange={set('destination')} className="pl-9" />
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="start_date">
              <Input id="start_date" type="date" required min={todayIso()} value={form.start_date} onChange={set('start_date')} />
            </Field>
            <Field label="End date" htmlFor="end_date">
              <Input id="end_date" type="date" required min={form.start_date || todayIso()} value={form.end_date} onChange={set('end_date')} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Min budget per person" htmlFor="budget_min">
              <BudgetInput id="budget_min" value={form.budget_min} onChange={set('budget_min')} placeholder="10,000" />
            </Field>
            <Field label="Max budget per person" htmlFor="budget_max">
              <BudgetInput id="budget_max" value={form.budget_max} onChange={set('budget_max')} placeholder="25,000" />
            </Field>
          </div>

          {(datesValid || budgetValid) && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">
              {datesValid && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-indigo-500" />
                  {tripLengthDays(form.start_date, form.end_date)}-day trip
                </span>
              )}
              {budgetValid && (
                <span className="flex items-center gap-1.5">
                  <Wallet className="size-4 text-indigo-500" />
                  {formatBudget(form.budget_min, form.budget_max)} per person
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <ButtonLink to="/" variant="ghost" className="w-full sm:w-auto">
              Cancel
            </ButtonLink>
            <Button type="submit" icon={Sparkles} loading={creating}>
              {creating ? 'Creating...' : 'Create trip'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function BudgetInput(props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400">₹</span>
      <Input type="number" required min="0" step="any" inputMode="numeric" className="pl-7" {...props} />
    </div>
  )
}
