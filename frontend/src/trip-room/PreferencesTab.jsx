import { useEffect, useState } from 'react'
import { api } from '../api/client'

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

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="space-y-6">
      {status && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-800">
            {status.all_submitted
              ? 'Everyone has submitted their preferences'
              : `Waiting on ${status.total_members - status.submitted_count} of ${status.total_members} members`}
          </h2>
          <ul className="space-y-1">
            {status.members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    m.submitted ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <span className="text-slate-700">{m.name}</span>
                <span className="text-xs text-slate-400">{m.submitted ? 'submitted' : 'waiting'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Your preferences</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                  form.interests.includes(opt.value)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={form.interests.includes(opt.value)}
                  onChange={() => toggleInterest(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Budget comfort</p>
          <div className="flex flex-wrap gap-4">
            {BUDGET_COMFORT.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="radio"
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
          <div className="flex flex-col gap-1.5">
            {DATE_FLEXIBILITY.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="radio"
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving || form.interests.length === 0}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save preferences'}
        </button>
      </form>
    </div>
  )
}
