import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-ink-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <span className="flex items-center gap-2.5 font-display text-lg font-bold">
            <Logo id="footer" size={32} />
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
