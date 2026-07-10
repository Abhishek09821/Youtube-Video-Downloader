import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/download', label: 'Download' },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
]

function BrandMark() {
  return (
    <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-red-glow to-red-brand shadow-glow">
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
      <svg viewBox="0 0 24 24" className="relative h-5 w-5 text-white" fill="none" aria-hidden="true">
        <path d="M9 8.2v5.6a.5.5 0 0 0 .77.42l4.3-2.8a.5.5 0 0 0 0-.84l-4.3-2.8A.5.5 0 0 0 9 8.2Z" fill="currentColor" />
        <path d="M12 15.6v3.2M9.4 17.2l2.6 2.4 2.6-2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-900/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <BrandMark />
          <span className="text-xl font-bold tracking-tight">
            <span className="text-white">V</span>
            <span className="text-metallic-red">Down</span>
          </span>
        </Link>

        {/* Center pill nav (desktop) */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/[0.06] bg-ink-700/70 p-1 backdrop-blur-md md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                [
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-red-brand/15 text-white shadow-glow-sm ring-1 ring-red-glow/30'
                    : 'text-silver hover:bg-white/5 hover:text-white',
                ].join(' ')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-2 rounded-full border border-white/[0.06] bg-ink-700/70 px-3 py-1.5 text-xs text-silver backdrop-blur-md sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-red-glow shadow-glow-sm" />
            Dark
          </span>
          <Link
            to="/download"
            className="hidden rounded-full bg-red-brand px-4 py-2 text-sm font-semibold text-white shadow-glow transition-all hover:bg-red-glow sm:inline-flex"
          >
            Open App
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.06] bg-ink-700/70 text-silver transition-colors hover:text-white md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="border-t border-white/[0.06] bg-ink-900/95 px-6 py-3 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-red-brand/15 text-white ring-1 ring-red-glow/30'
                      : 'text-silver hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link
              to="/download"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-red-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-glow"
            >
              Open App
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
