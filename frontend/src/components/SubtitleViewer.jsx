import { useState } from 'react'
import './subtitleviewer.css'

export default function SubtitleViewer({ loading, lines, meta }) {
  const [copied, setCopied] = useState(false)

  if (!loading && !lines) return null

  async function copyAll() {
    const text = (lines || []).map((l) => (l.time ? `[${l.time}] ${l.text}` : l.text)).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div className="surface sv">
      <div className="sv-head">
        <div className="sv-head-left">
          <span className="sv-title">Captions</span>
          {meta && <span className="sv-meta dim">{meta.lang?.toUpperCase()} · {meta.count} lines</span>}
          {meta?.kind && (
            <span className={meta.kind.includes('auto') ? 'sv-kind auto' : 'sv-kind manual'}>
              {meta.kind.includes('auto') ? 'Auto-generated' : 'Manual'}
            </span>
          )}
        </div>
        {lines && lines.length > 0 && (
          <button className="btn btn-ghost sv-copy" onClick={copyAll}>{copied ? 'Copied' : 'Copy all'}</button>
        )}
      </div>
      <div className="sv-body">
        {loading && <div className="sv-state"><span className="sv-spin" /> Fetching captions…</div>}
        {!loading && lines && lines.length === 0 && <div className="sv-state">No caption lines found.</div>}
        {!loading && lines && lines.map((l, i) => (
          <div className="sv-line" key={i}>
            {l.time && <span className="sv-ts">{l.time}</span>}
            <span className="sv-txt">{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
