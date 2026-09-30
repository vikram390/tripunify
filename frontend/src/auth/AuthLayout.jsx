import { MessagesSquare, Sparkles, UsersRound } from 'lucide-react'
import { Logo } from '../components/Logo'

const HIGHLIGHTS = [
  { icon: UsersRound, text: 'Invite your group with one link' },
  { icon: Sparkles, text: 'AI drafts a day-by-day plan from everyone’s preferences' },
  { icon: MessagesSquare, text: 'Discuss, tweak and finalize together in real time' },
]

/** Split screen on desktop (brand panel + form), a single clean column on phones. */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-white lg:flex">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <Logo light />
        <div className="relative">
          <h2 className="text-4xl leading-tight font-bold tracking-tight">
            Group trips,
            <br />
            planned together.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} TripUnify</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
