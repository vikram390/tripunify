import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Logo } from './Logo'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <Logo />
      <div className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Compass className="size-7" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-1 text-sm text-slate-500">Looks like this route isn't on the map.</p>
      </div>
      <Link to="/" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
        Back to my trips
      </Link>
    </div>
  )
}
