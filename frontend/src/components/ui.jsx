import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { initials } from '../lib/format'

const BUTTON_VARIANTS = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  dark: 'bg-slate-900 text-white shadow-sm hover:bg-slate-700',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
}

const BUTTON_SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-5 text-base',
}

function buttonClass(variant, size, className) {
  return `inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`
}

/** A router link that looks like a Button (avoids nesting a <button> inside an <a>). */
export function ButtonLink({ variant = 'primary', size = 'md', icon: Icon, className = '', children, ...props }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {Icon && <Icon className="size-4" />}
      {children}
    </Link>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </button>
  )
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon className="size-5" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500'

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function Input(props) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />
}

export function Alert({ tone = 'error', children }) {
  const tones = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  }
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
}

export function Badge({ tone = 'slate', children, className = '' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
    emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    // For use on top of the colourful trip cover gradients.
    light: 'bg-white/90 text-slate-800',
    glass: 'bg-slate-900/35 text-white ring-1 ring-white/25 backdrop-blur-sm',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-orange-500',
]

function colorFor(seed = '') {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function Avatar({ name, seed, size = 'md', className = '' }) {
  const sizes = { sm: 'size-7 text-xs', md: 'size-9 text-sm', lg: 'size-12 text-base', xl: 'size-20 text-2xl' }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorFor(seed || name)} ${sizes[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="size-5 animate-spin text-indigo-500" />
      {label}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  )
}
