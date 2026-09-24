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

// Authenticated file download (the export endpoints need the Bearer token, so a
// plain <a href> won't work) — fetches the file as a blob and saves it.
export async function downloadFile(path, fallbackName) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.detail || `Download failed (${res.status})`)
  }
  const disposition = res.headers.get('Content-Disposition') || ''
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || fallbackName
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  createTrip: (payload) => request('/trips', { method: 'POST', body: payload }),
  listTrips: () => request('/trips'),
  getTrip: (id) => request(`/trips/${id}`),
  joinTrip: (inviteCode) => request('/trips/join', { method: 'POST', body: { invite_code: inviteCode } }),
  previewTrip: (inviteCode) => request(`/trips/preview/${inviteCode}`),
  getMyPreferences: (tripId) => request(`/trips/${tripId}/preferences/me`),
  savePreferences: (tripId, payload) =>
    request(`/trips/${tripId}/preferences/me`, { method: 'PUT', body: payload }),
  getPreferencesStatus: (tripId) => request(`/trips/${tripId}/preferences/status`),
  generateItinerary: (tripId) => request(`/trips/${tripId}/itinerary/generate`, { method: 'POST' }),
  getItinerary: (tripId) => request(`/trips/${tripId}/itinerary`),
  setItineraryStatus: (tripId, status) =>
    request(`/trips/${tripId}/itinerary/status`, { method: 'PUT', body: { status } }),
  getStayOptions: (tripId, refresh = false) =>
    request(`/trips/${tripId}/stay-options${refresh ? '?refresh=true' : ''}`),
  regenerateDay: (tripId, dayNumber, instruction) =>
    request(`/trips/${tripId}/itinerary/days/${dayNumber}/regenerate`, {
      method: 'POST',
      body: { instruction },
    }),
  getChatMessages: (tripId) => request(`/trips/${tripId}/chat/messages`),
  sendChatMessage: (tripId, payload) =>
    request(`/trips/${tripId}/chat/messages`, { method: 'POST', body: payload }),
}
