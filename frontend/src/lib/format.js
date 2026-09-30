// Trip dates come from the API as plain "YYYY-MM-DD" strings — parse them as
// local dates so they don't shift a day in timezones behind UTC.
export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function today() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const DAY_MS = 24 * 60 * 60 * 1000

export function formatDateRange(startIso, endIso) {
  const start = parseDate(startIso)
  const end = parseDate(endIso)
  const sameYear = start.getFullYear() === end.getFullYear()
  const startText = start.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const endText = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startText} – ${endText}`
}

export function formatDay(iso) {
  return parseDate(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatMonthYear(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function tripLengthDays(startIso, endIso) {
  return Math.round((parseDate(endIso) - parseDate(startIso)) / DAY_MS) + 1
}

export function formatBudget(min, max) {
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`
}

/** Where a trip sits relative to today: upcoming (with a countdown), ongoing, or completed. */
export function tripTiming(trip) {
  const now = today()
  const start = parseDate(trip.start_date)
  const end = parseDate(trip.end_date)
  if (now < start) {
    const days = Math.round((start - now) / DAY_MS)
    return { state: 'upcoming', label: days === 1 ? 'Starts tomorrow' : `In ${days} days` }
  }
  if (now > end) return { state: 'completed', label: 'Completed' }
  return { state: 'ongoing', label: 'Happening now' }
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || ''
}

// A few gradients so trip cards are easy to tell apart at a glance.
const COVERS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-fuchsia-500 to-purple-600',
]

export function coverFor(id = '') {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return COVERS[hash % COVERS.length]
}
