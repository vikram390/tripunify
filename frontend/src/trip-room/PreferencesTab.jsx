import { useEffect, useState } from 'react'
import { Check, CircleDashed, ClipboardList, Users } from 'lucide-react'
import { api } from '../api/client'
import { Alert, Avatar, Button, CardHeader, inputClass } from '../components/ui'

const INTERESTS = [
  { value: 'adventure', label: 'Adventure' },
  { value: 'food', label: 'Food' },
  { value: 'culture', label: 'Culture' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'nightlife', label: 'Nightlife' },
]

const BUDGET_COMFORT = [
  { value: 'budget', label: 'Budget-friendly' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'luxury', label: 'Luxury' },
]

const DATE_FLEXIBILITY = [
  { value: 'fixed', label: 'Fixed — these exact dates only' },
  { value: 'flexible_few_days', label: 'Flexible by a few days' },
  { value: 'very_flexible', label: 'Very flexible' },
]

const OPTION_CLASS = (selected) =>
  `flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
    selected ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
  }`

const emptyForm = {
  interests: [],
  budget_comfort: 'moderate',
  date_flexibility: 'fixed',
  must_see: '',
}

export default function PreferencesTab({ tripId }) {
  const [status, setStatus] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    load()
  }, [tripId])

  async function load() {
    setLoading(true)
    try {
      const [mine, statusData] = await Promise.all([
        api.getMyPreferences(tripId),
        api.getPreferencesStatus(tripId),
      ])
      if (mine) {
        setForm({
          interests: mine.interests,
          budget_comfort: mine.budget_comfort,
          date_flexibility: mine.date_flexibility,
          must_see: mine.must_see,
        })
      }
      setStatus(statusData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleInterest(value) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(value)
        ? f.interests.filter((i) => i !== value)
        : [...f.interests, value],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      await api.savePreferences(tripId, form)
      setStatus(await api.getPreferencesStatus(tripId))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading preferences...</p>

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      {status && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2 lg:self-start">
          <CardHeader
            icon={Users}
            title={
              status.all_submitted
                ? 'Everyone has submitted their preferences'
                : `Waiting on ${status.total_members - status.submitted_count} of ${status.total_members} members`
            }
          />
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(status.submitted_count / Math.max(status.total_members, 1)) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {status.submitted_count}/{status.total_members} submitted
          </p>
          <ul className="mt-4 space-y-2.5">
            {status.members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 text-sm">
                <Avatar name={m.name} seed={m.user_id} size="sm" />
                <span className="min-w-0 flex-1 truncate text-slate-700">{m.name}</span>
                {m.submitted ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check className="size-3.5" /> Submitted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <CircleDashed className="size-3.5" /> Waiting
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3"
      >
        <CardHeader
          icon={ClipboardList}
          title="Your preferences"
          description="The AI plans around everyone's answers and flags any clashes for the group."
        />
        {error && <Alert>{error}</Alert>}

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Interests <span className="font-normal text-slate-400">(pick at least one)</span></p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors select-none ${
                  form.interests.includes(opt.value)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={form.interests.includes(opt.value)}
                  onChange={() => toggleInterest(opt.value)}
                />
                {form.interests.includes(opt.value) && <Check className="size-3.5" />}
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Budget comfort</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {BUDGET_COMFORT.map((opt) => (
              <label key={opt.value} className={OPTION_CLASS(form.budget_comfort === opt.value)}>
                <input
                  type="radio"
                  className="accent-indigo-600"
                  name="budget_comfort"
                  checked={form.budget_comfort === opt.value}
                  onChange={() => setForm({ ...form, budget_comfort: opt.value })}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Date flexibility</p>
          <div className="grid grid-cols-1 gap-2">
            {DATE_FLEXIBILITY.map((opt) => (
              <label key={opt.value} className={OPTION_CLASS(form.date_flexibility === opt.value)}>
                <input
                  type="radio"
                  className="accent-indigo-600"
                  name="date_flexibility"
                  checked={form.date_flexibility === opt.value}
                  onChange={() => setForm({ ...form, date_flexibility: opt.value })}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Must-see places (optional)</label>
          <textarea
            value={form.must_see}
            onChange={(e) => setForm({ ...form, must_see: e.target.value })}
            maxLength={500}
            rows={3}
            placeholder="Any specific places, restaurants, or experiences you don't want to miss?"
            className={inputClass}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          loading={saving}
          disabled={form.interests.length === 0}
          icon={saved ? Check : undefined}
          className="w-full"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save preferences'}
        </Button>
      </form>
    </div>
  )
}
