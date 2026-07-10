import { useState } from 'react'

export default function SubtitleViewer({ loading, lines, meta }) {
  const [copied, setCopied] = useState(false)

  if (!loading && !lines) return null

  async function copyAll() {
    const text = (lines || [])
      .map((l) => (l.time ? `[${l.time}] ${l.text}` : l.text))
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  const isAuto = meta?.kind?.includes('auto')

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-red-glow/20 bg-ink-900 shadow-glow-sm animate-fade-up">
      {/* Terminal title bar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-ink-800 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-brand/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <span className="font-mono text-xs text-silver">captions.preview</span>
          {meta && (
            <span className="text-xs text-silver/60">
              {meta.lang?.toUpperCase()} · {meta.count} lines
            </span>
          )}
          {meta?.kind && (
            <span
              className={[
                'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                isAuto ? 'bg-white/5 text-silver' : 'bg-red-brand/15 text-red-glow',
              ].join(' ')}
            >
              {isAuto ? 'Auto' : 'Manual'}
            </span>
          )}
        </div>
        {lines && lines.length > 0 && (
          <button
            onClick={copyAll}
            className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-silver transition-colors hover:border-red-glow/40 hover:text-white"
          >
            {copied ? 'Copied' : 'Copy all'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-72 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
        {loading && (
          <div className="flex items-center gap-2 py-6 text-silver">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-glow/30 border-t-red-glow" />
            Fetching captions…
          </div>
        )}
        {!loading && lines && lines.length === 0 && (
          <div className="py-6 text-silver">No caption lines found.</div>
        )}
        {!loading &&
          lines &&
          lines.map((l, i) => (
            <div key={i} className="flex gap-3 py-0.5">
              {l.time && (
                <span className="shrink-0 select-none text-red-glow/70">{l.time}</span>
              )}
              <span className="text-white/90">{l.text}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
