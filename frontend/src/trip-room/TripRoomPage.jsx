import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, getToken } from '../api/client'
import { Navbar } from '../components/Navbar'
import ChatTab from './ChatTab'
import ItineraryTab from './ItineraryTab'
import PreferencesTab from './PreferencesTab'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'chat', label: 'Chat' },
]

export default function TripRoomPage() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const [itinerary, setItinerary] = useState(null)
  const [itineraryLoading, setItineraryLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    api.getTrip(tripId).then(setTrip).catch((err) => setError(err.message))
    api
      .getItinerary(tripId)
      .then(setItinerary)
      .catch((err) => setError(err.message))
      .finally(() => setItineraryLoading(false))
    api
      .getChatMessages(tripId)
      .then(setMessages)
      .catch((err) => setError(err.message))
      .finally(() => setMessagesLoading(false))
  }, [tripId])

  // One WebSocket connection per trip room, shared by chat and itinerary live
  // updates, so both work no matter which tab is currently active.
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/trips/${tripId}/chat/ws?token=${getToken()}`)
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'chat_message') {
        setMessages((prev) => [...prev, data.message])
      } else if (data.type === 'itinerary_updated') {
        setItinerary(data.itinerary)
      }
    }
    return () => ws.close()
  }, [tripId])

  function copyInviteLink() {
    const link = `${window.location.origin}/join/${trip.invite_code}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSendMessage(content) {
    await api.sendChatMessage(tripId, { content })
  }

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>
  if (!trip) return <div className="p-8 text-center text-slate-500">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800">{trip.name}</h1>
          <p className="text-slate-500">{trip.destination}</p>
          <p className="mt-2 text-sm text-slate-500">
            {trip.start_date} → {trip.end_date} · Budget: {trip.budget_min}–{trip.budget_max}
          </p>
        </div>

        <div className="mb-6 flex gap-1 border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 rounded-md bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Invite code</span>
                <span className="font-mono text-lg font-semibold tracking-wider text-slate-800">
                  {trip.invite_code}
                </span>
                <button
                  onClick={copyInviteLink}
                  className="ml-auto rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-white"
                >
                  {copied ? 'Copied!' : 'Copy invite link'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-slate-800">Members ({trip.members.length})</h2>
              <ul className="divide-y divide-slate-100">
                {trip.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </div>
                    {m.is_organizer && (
                      <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600">
                        Organizer
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && <PreferencesTab tripId={tripId} />}
        {activeTab === 'itinerary' && (
          <ItineraryTab
            trip={trip}
            itinerary={itinerary}
            loading={itineraryLoading}
            onItineraryChange={setItinerary}
          />
        )}
        {activeTab === 'chat' && (
          <ChatTab
            messages={messages}
            loading={messagesLoading}
            connected={wsConnected}
            onSend={handleSendMessage}
          />
        )}
      </main>
    </div>
  )
}
