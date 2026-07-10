import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-ink-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <span className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-brand shadow-glow-sm">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden="true">
                <path d="M9 8.2v5.6a.5.5 0 0 0 .77.42l4.3-2.8a.5.5 0 0 0 0-.84l-4.3-2.8A.5.5 0 0 0 9 8.2Z" />
              </svg>
            </span>
            <span>V<span className="text-metallic-red">Down</span></span>
          </span>
          <p className="mt-4 max-w-xs text-sm text-silver">
            A fast, minimal engine for downloading video, audio and captions. Built for speed and clarity.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-silver/70">Product</h4>
          <Link className="text-silver transition-colors hover:text-white" to="/download">Downloads</Link>
          <Link className="text-silver transition-colors hover:text-white" to="/features">Features</Link>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-silver/70">Company</h4>
          <Link className="text-silver transition-colors hover:text-white" to="/about">About</Link>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-silver/60">
          © {new Date().getFullYear()} VDown · yt-dlp powered · Personal use only
        </div>
      </div>
    </footer>
  )
}
