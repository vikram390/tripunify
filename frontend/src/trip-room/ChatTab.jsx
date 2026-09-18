import { useEffect, useRef, useState } from 'react'
import { api, getToken } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export default function ChatTab({ tripId }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    api
      .getChatMessages(tripId)
      .then((data) => {
        if (!cancelled) setMessages(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/trips/${tripId}/chat/ws?token=${getToken()}`)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'chat_message') {
        setMessages((prev) => [...prev, data.message])
      }
    }
    wsRef.current = ws

    return () => {
      cancelled = true
      ws.close()
    }
  }, [tripId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setText('')
    try {
      await api.sendChatMessage(tripId, { content })
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="flex h-[32rem] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <h2 className="text-sm font-semibold text-slate-800">Group chat</h2>
        <span className={`text-xs ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>
          {connected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet — say hi!</p>}
        {messages.map((m) => {
          const mine = m.user_id === user?.id
          return (
            <div key={m.id} className={mine ? 'text-right' : ''}>
              <p className="text-xs text-slate-400">{mine ? 'You' : m.user_name}</p>
              <p
                className={`inline-block max-w-[75%] rounded-lg px-3 py-2 text-left text-sm ${
                  mine ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.content}
              </p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-200 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Send
        </button>
      </form>
    </div>
  )
}
