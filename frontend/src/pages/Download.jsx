import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../hooks/useApi.js'
import HealthBadge from '../components/HealthBadge.jsx'
import SubtitleViewer from '../components/SubtitleViewer.jsx'

/* ---------- static option data ---------- */
const VIDEO_ROWS = [
  { q: '2160', label: '4K', res: '3840 × 2160', mbps: 45 },
  { q: '1440', label: '2K', res: '2560 × 1440', mbps: 16 },
  { q: '1080', label: '1080p', res: '1920 × 1080', mbps: 8 },
  { q: '720', label: '720p', res: '1280 × 720', mbps: 5 },
  { q: '480', label: '480p', res: '854 × 480', mbps: 2.5 },
  { q: '360', label: '360p', res: '640 × 360', mbps: 1 },
  { q: '240', label: '240p', res: '426 × 240', mbps: 0.6 },
  { q: '144', label: '144p', res: '256 × 144', mbps: 0.3 },
]
const VIDEO_FORMATS = ['mp4', 'mkv', 'webm']

const AUDIO_ROWS = [
  { kbps: '320', label: 'Audio Best', res: '320 kbps', abr: 320 },
  { kbps: '256', label: 'Audio High', res: '256 kbps', abr: 256 },
  { kbps: '192', label: 'Audio Std', res: '192 kbps', abr: 192 },
  { kbps: '128', label: 'Audio', res: '128 kbps', abr: 128 },
  { kbps: '96', label: 'Audio Low', res: '96 kbps', abr: 96 },
  { kbps: '64', label: 'Audio Min', res: '64 kbps', abr: 64 },
]
const AUDIO_FORMATS = ['mp3', 'flac', 'wav', 'aac', 'ogg']

const SUB_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
]
const SUB_FORMATS = ['srt', 'vtt', 'txt']

const TABS = [
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'subtitle', label: 'Subtitles' },
]

const isValidUrl = (u) => /^https?:\/\/.+/i.test(u.trim())

function parseDuration(d) {
  if (!d) return 0
  const parts = String(d).split(':').map(Number)
  if (parts.some(Number.isNaN)) return 0
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

function humanSize(mb) {
  if (!mb || mb <= 0) return '—'
  if (mb >= 1024) return `~${(mb / 1024).toFixed(1)} GB`
  return `~${Math.round(mb)} MB`
}

export default function Download() {
  const [url, setUrl] = useState('')
  const [analysedUrl, setAnalysedUrl] = useState('')
  const [phase, setPhase] = useState('input') // input | loading | ready
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('video')

  // format selections
  const [videoFormat, setVideoFormat] = useState('mp4')
  const [audioFormat, setAudioFormat] = useState('mp3')
  const [subLang, setSubLang] = useState('en')
  const [subFormat, setSubFormat] = useState('srt')

  // download job state
  const [job, setJob] = useState(null) // { status, progress, speed, rowId }
  const [fileUrl, setFileUrl] = useState('')
  const pollRef = useRef(null)

  // subtitle viewer state
  const [subLines, setSubLines] = useState(null)
  const [subMeta, setSubMeta] = useState(null)
  const [subLoading, setSubLoading] = useState(false)

  // AI enhance confirmation modal
  const [enhanceRow, setEnhanceRow] = useState(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  const durationSec = parseDuration(info?.duration)

  // Native (source) resolutions actually available for this media.
  const nativeHeights = (info?.available_qualities || [])
    .map((q) => parseInt(q.quality, 10))
    .filter(Boolean)
  const nativeMax = nativeHeights.length ? Math.max(...nativeHeights) : 0
  const nativeLabel = nativeHeights.length
    ? [...new Set(nativeHeights)].sort((a, b) => b - a).map((h) => `${h}p`).join(', ')
    : ''
  const busy = job && job.status !== 'done' && job.status !== 'error'
  // A new/edited URL after a result was shown means results are stale.
  const stale = phase === 'ready' && url.trim() !== analysedUrl

  /* ---------- analyse ---------- */
  async function handleAnalyse() {
    const clean = url.trim()
    if (!clean) {
      setError('Paste a media URL first.')
      return
    }
    if (!isValidUrl(clean)) {
      setError('Enter a valid link starting with http:// or https://')
      return
    }
    // full reset of any previous session artefacts
    clearInterval(pollRef.current)
    setPhase('loading')
    setError('')
    setInfo(null)
    setJob(null)
    setFileUrl('')
    setSubLines(null)
    setSubMeta(null)
    setTab('video')
    try {
      const d = await api.info(clean)
      if (d.error) {
        setError(d.error)
        setPhase('input')
        return
      }
      setInfo(d)
      setAnalysedUrl(clean)
      setPhase('ready')
    } catch {
      setError('Cannot reach the engine. Is the backend running?')
      setPhase('input')
    }
  }

  /* ---------- reset ---------- */
  function resetAll() {
    clearInterval(pollRef.current)
    setUrl('')
    setAnalysedUrl('')
    setPhase('input')
    setInfo(null)
    setError('')
    setJob(null)
    setFileUrl('')
    setSubLines(null)
    setSubMeta(null)
    setTab('video')
  }

  /* ---------- polling ---------- */
  function pollJob(jobId, rowId) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const d = await api.status(jobId)
        setJob({ ...d, rowId })
        if (d.status === 'done') {
          clearInterval(pollRef.current)
          setFileUrl(api.fileUrl(jobId))
        } else if (d.status === 'error') {
          clearInterval(pollRef.current)
          setError(d.error || 'Download failed.')
        }
      } catch {
        clearInterval(pollRef.current)
        setError('Lost connection to the engine.')
      }
    }, 800)
  }

  /* ---------- media downloads ---------- */
  async function startVideo(row, enhance = false) {
    if (!isValidUrl(analysedUrl)) {
      setError('Analyse a valid media link first.')
      return
    }
    setError('')
    setFileUrl('')
    setJob({ status: 'starting', progress: 0, rowId: `v-${row.q}` })
    try {
      const d = await api.downloadVideo(analysedUrl, row.q + 'p', videoFormat, enhance)
      if (d.error) {
        setError(d.error)
        setJob(null)
        return
      }
      pollJob(d.job_id, `v-${row.q}`)
    } catch {
      setError('Cannot reach the engine.')
      setJob(null)
    }
  }

  function confirmEnhance() {
    const row = enhanceRow
    setEnhanceRow(null)
    if (row) startVideo(row, true)
  }

  async function startAudio(row) {
    if (!isValidUrl(analysedUrl)) {
      setError('Analyse a valid media link first.')
      return
    }
    setError('')
    setFileUrl('')
    setJob({ status: 'starting', progress: 0, rowId: `a-${row.kbps}` })
    try {
      const d = await api.downloadAudio(analysedUrl, row.kbps, audioFormat)
      if (d.error) {
        setError(d.error)
        setJob(null)
        return
      }
      pollJob(d.job_id, `a-${row.kbps}`)
    } catch {
      setError('Cannot reach the engine.')
      setJob(null)
    }
  }

  function stopDownload() {
    clearInterval(pollRef.current)
    setJob(null)
    setFileUrl('')
  }

  /* ---------- subtitles ---------- */
  async function handleViewSubtitles() {
    setSubLoading(true)
    setSubLines(null)
    setSubMeta(null)
    setError('')
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 50000)
      const d = await api.viewSubtitles(analysedUrl, subLang, ctrl.signal)
      clearTimeout(t)
      if (d.error) {
        setError(d.error)
        return
      }
      setSubLines(d.lines || [])
      setSubMeta({ lang: d.lang, kind: d.kind, count: d.count })
    } catch (e) {
      setError(
        e.name === 'AbortError'
          ? 'Timed out. Analyse again and retry.'
          : 'Cannot reach the engine.',
      )
    } finally {
      setSubLoading(false)
    }
  }

  async function handleDownloadSubtitle() {
    setError('')
    setFileUrl('')
    setJob({ status: 'starting', progress: 5, rowId: 'sub' })
    try {
      const d = await api.downloadSubtitle(analysedUrl, subLang, subFormat)
      if (d.error) {
        setError(d.error)
        setJob(null)
        return
      }
      pollJob(d.job_id, 'sub')
    } catch {
      setError('Cannot reach the engine.')
      setJob(null)
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 pt-14">
      {/* ---------- HERO SEARCH ---------- */}
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-red-glow/20 bg-red-brand/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-red-glow">
          High-Speed Engine
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          <span className="text-metallic">VDown: Modern &amp; Fast</span>{' '}
          <span className="text-metallic-red">Media Downloader</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-silver sm:text-base">
          High-Speed Engine | All Video Formats (4K, HD) | Audio Extraction | Subtitle Support
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-xs text-silver/70">
          Works with YouTube, Instagram, X (Twitter), Reddit, TikTok, Snapchat, Telegram and more.
        </p>
      </div>

      {/* URL input */}
      <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-3">
        <UrlInput
          url={url}
          setUrl={setUrl}
          onSubmit={handleAnalyse}
          loading={phase === 'loading'}
        />
        <div className="flex items-center gap-3 text-xs text-silver">
          <HealthBadge />
          {phase === 'ready' && (
            <button
              onClick={resetAll}
              className="rounded-full border border-white/10 px-3 py-1.5 font-medium transition-colors hover:border-red-glow/40 hover:text-white"
            >
              New download
            </button>
          )}
        </div>
      </div>

      {/* error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto mt-6 flex max-w-3xl items-center justify-between gap-4 rounded-lg border border-red-brand/40 bg-red-brand/10 px-4 py-3 text-sm text-white"
          >
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="shrink-0 text-xs font-semibold text-red-glow hover:text-white"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- MEDIA INFO + FORMAT SELECTOR ---------- */}
      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-12 flex flex-col items-center gap-4 py-16 text-silver"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-red-glow/30 border-t-red-glow" />
            <span className="text-sm">Analysing media…</span>
          </motion.div>
        )}

        {phase === 'ready' && info && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.35 }}
            className="mt-12"
          >
            {stale && (
              <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-white/10 bg-ink-700/60 px-4 py-3 text-center text-xs text-silver">
                URL changed — analyse again to refresh results.
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              {/* Left: thumbnail + details */}
              <MediaCard info={info} />

              {/* Right: tabs + panels */}
              <div className="glass rounded-2xl p-1.5">
                {/* Tab bar */}
                <div className="relative flex gap-1 rounded-xl bg-ink-900/60 p-1">
                  {TABS.map((t) => {
                    const active = tab === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={[
                          'relative flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
                          active ? 'text-white' : 'text-silver hover:text-white',
                        ].join(' ')}
                      >
                        {active && (
                          <motion.span
                            layoutId="tab-pill"
                            className="absolute inset-0 rounded-lg bg-red-brand/15 shadow-glow-sm ring-1 ring-red-glow/30"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10">{t.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Panels — strict isolation: only the active tab renders */}
                <div className="p-4 sm:p-5">
                  <AnimatePresence mode="wait">
                    {tab === 'video' && (
                      <TabPanel key="video">
                        <FormatSelector
                          label="Container"
                          options={VIDEO_FORMATS}
                          value={videoFormat}
                          onChange={setVideoFormat}
                        />
                        {nativeLabel && (
                          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-silver">
                            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                              Native: {nativeLabel} available
                            </span>
                            {nativeMax > 0 && nativeMax < 2160 && (
                              <span className="rounded-md border border-red-glow/30 bg-red-brand/10 px-2 py-1 text-red-glow">
                                Higher tiers use AI Video Enhance
                              </span>
                            )}
                          </div>
                        )}
                        <OptionsTable
                          rows={VIDEO_ROWS.map((r) => {
                            const h = parseInt(r.q, 10)
                            const needsEnhance = nativeMax > 0 && h > nativeMax
                            return {
                              id: `v-${r.q}`,
                              quality: r.label,
                              resolution: r.res,
                              format: needsEnhance ? 'MP4 · AI' : videoFormat.toUpperCase(),
                              size: humanSize((durationSec * r.mbps) / 8),
                              enhance: needsEnhance,
                              onDownload: () =>
                                needsEnhance ? setEnhanceRow(r) : startVideo(r),
                            }
                          })}
                          job={job}
                          fileUrl={fileUrl}
                          onStop={stopDownload}
                        />
                      </TabPanel>
                    )}

                    {tab === 'audio' && (
                      <TabPanel key="audio">
                        <FormatSelector
                          label="Format"
                          options={AUDIO_FORMATS}
                          value={audioFormat}
                          onChange={setAudioFormat}
                        />
                        <OptionsTable
                          rows={AUDIO_ROWS.map((r) => ({
                            id: `a-${r.kbps}`,
                            quality: r.label,
                            resolution: r.res,
                            format: audioFormat.toUpperCase(),
                            size: humanSize((durationSec * r.abr) / 8 / 1000),
                            onDownload: () => startAudio(r),
                          }))}
                          job={job}
                          fileUrl={fileUrl}
                          onStop={stopDownload}
                        />
                      </TabPanel>
                    )}

                    {tab === 'subtitle' && (
                      <TabPanel key="subtitle">
                        <SubtitleWorkspace
                          langs={SUB_LANGS}
                          subLang={subLang}
                          setSubLang={setSubLang}
                          formats={SUB_FORMATS}
                          subFormat={subFormat}
                          setSubFormat={setSubFormat}
                          onView={handleViewSubtitles}
                          onDownload={handleDownloadSubtitle}
                          loading={subLoading}
                          lines={subLines}
                          meta={subMeta}
                          job={job}
                          fileUrl={fileUrl}
                        />
                      </TabPanel>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- AI ENHANCE CONFIRM MODAL ---------- */}
      <AnimatePresence>
        {enhanceRow && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setEnhanceRow(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-2xl border border-red-glow/30 bg-ink-700/95 p-6 shadow-glow-lg backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-brand/15 text-red-glow shadow-glow-sm">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="3.2" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">AI Video Enhance</h3>
                  <p className="text-xs text-silver">Upscale beyond the source resolution</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-silver">
                This source maxes out at{' '}
                <span className="font-semibold text-white">{nativeMax}p</span>. VDown can
                AI-upscale it to{' '}
                <span className="font-semibold text-red-glow">
                  {enhanceRow.label} ({enhanceRow.res})
                </span>{' '}
                using super-resolution. It sharpens detail and re-encodes the video, so it
                takes noticeably longer than a normal download.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEnhanceRow(null)}
                  className="btn-outline"
                >
                  No, cancel
                </button>
                <button onClick={confirmEnhance} className="btn-red">
                  Yes, enhance to {enhanceRow.label}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ==================== SUB COMPONENTS ==================== */

function UrlInput({ url, setUrl, onSubmit, loading }) {
  async function paste() {
    try {
      setUrl(await navigator.clipboard.readText())
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="group relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-700/80 p-2 backdrop-blur-md transition-all duration-300 focus-within:border-red-glow focus-within:shadow-glow group-hover:border-red-glow/40">
        <span className="grid h-9 w-9 shrink-0 place-items-center text-silver">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="Paste a video link (YouTube, Instagram, X, Reddit, TikTok...)"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-silver/60 focus:outline-none"
        />
        <button
          onClick={paste}
          type="button"
          className="hidden shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-silver transition-colors hover:text-white sm:block"
        >
          Paste
        </button>
        <button onClick={onSubmit} disabled={loading} className="btn-red shrink-0">
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Analysing
            </>
          ) : (
            'Analyse'
          )}
        </button>
      </div>
    </div>
  )
}

function MediaCard({ info }) {
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="relative aspect-video bg-ink-900">
        {info.thumbnail ? (
          <img src={info.thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-900" />
        )}
        {info.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-xs text-white">
            {info.duration}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
          {info.title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {info.channel && <Tag>{info.channel}</Tag>}
          {info.views && <Tag>{info.views} views</Tag>}
          {info.has_subtitles && <Tag accent>Captions available</Tag>}
        </div>
      </div>
    </div>
  )
}

function Tag({ children, accent }) {
  return (
    <span
      className={[
        'rounded-md border px-2 py-1 text-xs',
        accent
          ? 'border-red-glow/30 bg-red-brand/10 text-red-glow'
          : 'border-white/10 bg-white/5 text-silver',
      ].join(' ')}
    >
      {children}
    </span>
  )
}

function TabPanel({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

function FormatSelector({ label, options, value, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-silver/70">
        {label}
      </span>
      {options.map((f) => {
        const active = value === f
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={[
              'rounded-md border px-3 py-1.5 text-xs font-semibold uppercase transition-all',
              active
                ? 'border-red-glow bg-red-brand/15 text-red-glow shadow-glow-sm'
                : 'border-white/10 bg-white/5 text-silver hover:border-white/20 hover:text-white',
            ].join(' ')}
          >
            {f}
          </button>
        )
      })}
    </div>
  )
}

function OptionsTable({ rows, job, fileUrl, onStop }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5">
      {/* header */}
      <div className="grid grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr_auto] gap-2 border-b border-white/5 bg-ink-900/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-silver/70">
        <span>Quality</span>
        <span className="hidden sm:block">Resolution</span>
        <span>Format</span>
        <span>Size</span>
        <span className="text-right">Action</span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((r) => {
          const isRowJob = job?.rowId === r.id
          const active = isRowJob && job.status !== 'done' && job.status !== 'error'
          const done = isRowJob && job.status === 'done'
          return (
            <div
              key={r.id}
              className={[
                'grid grid-cols-[1.1fr_1.1fr_0.7fr_0.7fr_auto] items-center gap-2 px-4 py-3 text-sm transition-colors',
                isRowJob ? 'bg-red-brand/5' : 'hover:bg-white/[0.02]',
              ].join(' ')}
            >
              <span className="flex items-center gap-2 font-semibold text-white">
                {r.quality}
                {r.enhance && (
                  <span className="rounded border border-red-glow/40 bg-red-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-glow">
                    AI
                  </span>
                )}
              </span>
              <span className="hidden font-mono text-xs text-silver sm:block">{r.resolution}</span>
              <span className="text-silver">{r.format}</span>
              <span className="text-silver">{r.size}</span>
              <div className="flex justify-end">
                {done && fileUrl ? (
                  <a href={fileUrl} className="btn-red px-3 py-1.5 text-xs">
                    Save
                  </a>
                ) : active ? (
                  <button
                    onClick={onStop}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-glow/40 bg-red-brand/10 px-3 py-1.5 text-xs font-semibold text-red-glow"
                  >
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-glow/30 border-t-red-glow" />
                    {Math.round(job.progress || 0)}%
                  </button>
                ) : (
                  <button
                    onClick={r.onDownload}
                    disabled={!!job && job.status !== 'done' && job.status !== 'error'}
                    className={[
                      'px-3 py-1.5 text-xs disabled:opacity-30',
                      r.enhance
                        ? 'inline-flex items-center gap-1.5 rounded-lg border border-red-glow/50 bg-transparent font-semibold text-red-glow transition-colors hover:bg-red-brand/10'
                        : 'btn-red',
                    ].join(' ')}
                  >
                    {r.enhance ? 'AI Enhance' : 'Download'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* active job strip */}
      <AnimatePresence>
        {job && ['downloading', 'processing', 'starting', 'enhancing'].includes(job.status) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 bg-ink-900/60 px-4 py-3"
          >
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-white">{statusLabel(job)}</span>
              <span className="text-silver">{Math.round(job.progress || 0)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-red-brand shadow-glow-sm transition-all duration-300"
                style={{ width: `${job.progress || 0}%` }}
              />
            </div>
            {job.speed && <div className="mt-1.5 text-xs text-silver/60">{job.speed}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SubtitleWorkspace({
  langs,
  subLang,
  setSubLang,
  formats,
  subFormat,
  setSubFormat,
  onView,
  onDownload,
  loading,
  lines,
  meta,
  job,
  fileUrl,
}) {
  const subJobDone = job?.rowId === 'sub' && job.status === 'done'
  const subJobBusy =
    job?.rowId === 'sub' && job.status !== 'done' && job.status !== 'error'

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        {/* language dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-silver/70">
            Language
          </label>
          <div className="relative">
            <select
              value={subLang}
              onChange={(e) => setSubLang(e.target.value)}
              className="appearance-none rounded-lg border border-white/10 bg-ink-900 py-2.5 pl-3.5 pr-9 text-sm text-white transition-colors hover:border-red-glow/40 focus:border-red-glow focus:outline-none focus:shadow-glow-sm"
            >
              {langs.map((l) => (
                <option key={l.code} value={l.code} className="bg-ink-900">
                  {l.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-silver"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* export format */}
        <FormatSelector
          label="Export"
          options={formats}
          value={subFormat}
          onChange={setSubFormat}
        />

        <button onClick={onView} disabled={loading} className="btn-outline ml-auto">
          {loading ? 'Loading…' : 'View captions'}
        </button>
      </div>

      {/* terminal preview */}
      <SubtitleViewer loading={loading} lines={lines} meta={meta} />

      {/* download SRT */}
      <div className="mt-5 flex items-center justify-end gap-3">
        {subJobBusy && (
          <span className="text-xs text-silver">{statusLabel(job)} {Math.round(job.progress || 0)}%</span>
        )}
        {subJobDone && fileUrl ? (
          <a href={fileUrl} className="btn-red">
            Save subtitle file
          </a>
        ) : (
          <button onClick={onDownload} disabled={subJobBusy} className="btn-red">
            Download Subtitle (.{subFormat.toUpperCase()})
          </button>
        )}
      </div>
    </div>
  )
}

function statusLabel(job) {
  switch (job.status) {
    case 'starting':
      return 'Connecting…'
    case 'downloading':
      return 'Downloading…'
    case 'processing':
      return 'Processing…'
    case 'enhancing':
      return 'AI enhancing to 4K…'
    case 'done':
      return 'Complete'
    default:
      return job.status || 'Working…'
  }
}
