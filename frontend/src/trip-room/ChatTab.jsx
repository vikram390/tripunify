import { useEffect, useRef, useState } from 'react'
import { MessageCircle, SendHorizontal } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/ui'

function timeOf(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export default function ChatTab({ messages, loading, connected, onSend }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const listRef = useRef(null)

  // Scroll only the message list (not the whole page) so the tab bar stays in view.
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setText('')
    setError('')
    try {
      await onSend(content)
    } catch (err) {
      setError(err.message)
      setText(content)
    }
  }

  if (loading) return <p className="py-8 text-center text-sm text-slate-500">Loading chat...</p>

  return (
    // Fills the screen below the header/tabs; on phones it also clears the bottom nav bar.
    <div className="flex h-[calc(100dvh-15rem)] min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm md:h-[calc(100dvh-13rem)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MessageCircle className="size-4 text-indigo-500" /> Group chat
        </h2>
        <span className={`flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`size-2 rounded-full ${connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`} />
          {connected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-400">
            <MessageCircle className="mb-2 size-8 text-slate-300" />
            No messages yet — say hi to the group!
          </div>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.id
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {!mine && <Avatar name={m.user_name} seed={m.user_id} size="sm" />}
              <div className={`flex max-w-[80%] flex-col sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'}`}>
                <p className="mb-1 px-1 text-[11px] text-slate-400">
                  {mine ? 'You' : m.user_name} · {timeOf(m.created_at)}
                  {m.ref_day_number != null && <span className="ml-1 font-medium text-indigo-500">· on Day {m.ref_day_number}</span>}
                </p>
                <p
                  className={`rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap ${
                    mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {m.content}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the group..."
          className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </div>
  )
}
