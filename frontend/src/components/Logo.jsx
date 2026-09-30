import { Plane } from 'lucide-react'

export function Logo({ light = false }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
        <Plane className="size-4.5 -rotate-45" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Trip<span className={light ? 'text-indigo-200' : 'text-indigo-600'}>Unify</span>
      </span>
    </span>
  )
}
