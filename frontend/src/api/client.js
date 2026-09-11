const API_BASE = '/api'
export const TOKEN_KEY = 'tripunify_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data?.detail || `Request failed (${res.status})`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return data
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  createTrip: (payload) => request('/trips', { method: 'POST', body: payload }),
  listTrips: () => request('/trips'),
  getTrip: (id) => request(`/trips/${id}`),
  joinTrip: (inviteCode) => request('/trips/join', { method: 'POST', body: { invite_code: inviteCode } }),
  getMyPreferences: (tripId) => request(`/trips/${tripId}/preferences/me`),
  savePreferences: (tripId, payload) =>
    request(`/trips/${tripId}/preferences/me`, { method: 'PUT', body: payload }),
  getPreferencesStatus: (tripId) => request(`/trips/${tripId}/preferences/status`),
}
