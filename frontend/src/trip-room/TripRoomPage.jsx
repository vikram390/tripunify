import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Crown,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Route,
  Share2,
  Users,
  Wallet,
} from 'lucide-react'
import { api, getToken } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, Avatar, Badge, ButtonLink, Card, CardHeader, Spinner } from '../components/ui'
import { coverFor, formatBudget, formatDateRange, tripLengthDays, tripTiming } from '../lib/format'
import ChatTab from './ChatTab'
import ItineraryTab from './ItineraryTab'
import PreferencesTab from './PreferencesTab'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'preferences', label: 'Preferences', icon: ClipboardList },
  { id: 'itinerary', label: 'Itinerary', icon: Route },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
]

export default function TripRoomPage() {
  const { tripId } = useParams()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const [trip, setTrip] = useState(null)
  const [error, setError] = useState('')

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

  function selectTab(id) {
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true })
  }

  async function handleSendMessage(content, refDayNumber = null) {
    await api.sendChatMessage(tripId, { content, ref_day_number: refDayNumber })
  }

  if (error && !trip) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <Alert>{error}</Alert>
        <ButtonLink to="/" variant="secondary" icon={ArrowLeft}>
          Back to my trips
        </ButtonLink>
      </div>
    )
  }
  if (!trip) return <Spinner label="Loading trip..." />

  const isOrganizer = trip.organizer_id === user?.id
  const timing = tripTiming(trip)

  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> My trips
      </Link>

      <Card className="mb-5 overflow-hidden">
        <div className={`relative bg-gradient-to-br ${coverFor(trip.id)} px-5 py-6 text-white sm:px-6 sm:py-8`}>
          <MapPin className="absolute -right-6 -bottom-8 size-40 text-white/10" />
          <div className="relative flex flex-wrap items-center gap-2">
            <Badge tone="light">{timing.label}</Badge>
            {isOrganizer && (
              <Badge tone="glass">
                <Crown className="size-3" /> You're organizing
              </Badge>
            )}
          </div>
          <h1 className="relative mt-3 text-2xl font-bold tracking-tight break-words sm:text-3xl">{trip.name}</h1>
          <p className="relative mt-1 flex items-center gap-1.5 text-white/85">
            <MapPin className="size-4" /> {trip.destination}
          </p>
        </div>
        {/* gap-px over a tinted background draws the dividers in both the 2- and 3-column layouts */}
        <div className="grid grid-cols-2 gap-px bg-slate-100 text-sm sm:grid-cols-3">
          <Fact icon={CalendarDays} label="Dates">
            {formatDateRange(trip.start_date, trip.end_date)}
            <span className="block text-xs font-normal text-slate-500">
              {tripLengthDays(trip.start_date, trip.end_date)} days
            </span>
          </Fact>
          <Fact icon={Wallet} label="Budget per person">
            {formatBudget(trip.budget_min, trip.budget_max)}
          </Fact>
          <Fact icon={Users} label="Group" className="col-span-2 sm:col-span-1">
            <span className="flex items-center gap-2">
              <span className="flex -space-x-2">
                {trip.members.slice(0, 4).map((m) => (
                  <Avatar key={m.id} name={m.name} seed={m.id} size="sm" className="ring-2 ring-white" />
                ))}
              </span>
              {trip.members.length} {trip.members.length === 1 ? 'member' : 'members'}
            </span>
          </Fact>
        </div>
      </Card>

      <div className="sticky top-16 z-20 -mx-4 mb-5 border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
        <nav className="flex sm:gap-1" role="tablist" aria-label="Trip sections">
          {TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(tab.id)}
                // Phones: four equal tabs with the icon above the label, so every tab fits on screen.
                className={`relative flex flex-1 flex-col items-center gap-1 border-b-2 px-1 py-2.5 text-xs font-medium transition-colors sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
                  active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <tab.icon className="size-4" />
                {tab.label}
                {tab.id === 'chat' && messages.length > 0 && (
                  <span className="absolute top-1 right-[calc(50%-1.6rem)] rounded-full bg-indigo-600 px-1.5 text-[10px] leading-4 text-white sm:static sm:bg-slate-200 sm:text-[11px] sm:text-slate-600">
                    {messages.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {activeTab === 'overview' && <Overview trip={trip} currentUserId={user?.id} />}
      {activeTab === 'preferences' && <PreferencesTab tripId={tripId} />}
      {activeTab === 'itinerary' && (
        <ItineraryTab
          trip={trip}
          itinerary={itinerary}
          loading={itineraryLoading}
          onItineraryChange={setItinerary}
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      )}
      {activeTab === 'chat' && (
        <ChatTab messages={messages} loading={messagesLoading} connected={wsConnected} onSend={handleSendMessage} />
      )}
    </>
  )
}

function Fact({ icon: Icon, label, className = '', children }) {
  return (
    <div className={`flex items-start gap-3 bg-white px-4 py-3.5 sm:px-6 sm:py-4 ${className}`}>
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className="mt-0.5 font-medium text-slate-900">{children}</div>
      </div>
    </div>
  )
}

function Overview({ trip, currentUserId }) {
  const [copied, setCopied] = useState(null)
  const link = `${window.location.origin}/join/${trip.invite_code}`

  function copy(kind, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  async function share() {
    try {
      await navigator.share({ title: trip.name, text: `Join our trip "${trip.name}" on TripUnify`, url: link })
    } catch {
      // user closed the share sheet — nothing to do
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <Card className="p-5 sm:p-6 lg:col-span-2 lg:self-start">
        <CardHeader icon={Share2} title="Invite your group" description="Share the link, or read out the code." />
        <div className="mt-5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-center">
          <p className="text-xs font-medium tracking-wide text-indigo-600 uppercase">Invite code</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-slate-900">{trip.invite_code}</p>
        </div>
        <div className="mt-4 grid gap-2">
          <CopyButton onClick={() => copy('link', link)} done={copied === 'link'} primary>
            Copy invite link
          </CopyButton>
          <CopyButton onClick={() => copy('code', trip.invite_code)} done={copied === 'code'}>
            Copy code only
          </CopyButton>
          {typeof navigator.share === 'function' && (
            <button
              onClick={share}
              className="flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Share2 className="size-4" /> Share...
            </button>
          )}
        </div>
      </Card>

      <Card className="p-5 sm:p-6 lg:col-span-3">
        <CardHeader icon={Users} title={`Members (${trip.members.length})`} description="Everyone who has joined this trip." />
        <ul className="mt-4 divide-y divide-slate-100">
          {trip.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <Avatar name={m.name} seed={m.id} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {m.name}
                  {m.id === currentUserId && <span className="font-normal text-slate-400"> (you)</span>}
                </p>
                <p className="truncate text-xs text-slate-500">{m.email}</p>
              </div>
              {m.is_organizer && (
                <Badge tone="indigo">
                  <Crown className="size-3" /> Organizer
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function CopyButton({ onClick, done, primary, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
        primary
          ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? 'Copied!' : children}
    </button>
  )
}
