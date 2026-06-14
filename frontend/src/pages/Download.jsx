import { useEffect, useRef, useState } from 'react'
import { api } from '../hooks/useApi.js'
import HealthBadge from '../components/HealthBadge.jsx'
import SubtitleViewer from '../components/SubtitleViewer.jsx'
import './download.css'

const VIDEO_QUALITIES = ['2160', '1440', '1080', '720', '480', '360', '240', '144']
const VIDEO_FORMATS = ['mp4', 'mkv', 'webm']
const AUDIO_BITRATES = ['320', '256', '192', '128', '96', '64']
const AUDIO_FORMATS = ['mp3', 'flac', 'wav', 'aac', 'ogg']
const SUB_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
]
const SUB_FORMATS = ['srt', 'vtt', 'txt']

const isYouTube = (u) => u.includes('youtube') || u.includes('youtu.be')

export default function Download() {
  const [url, setUrl] = useState('')
  const [tab, setTab] = useState('video')
  const [info, setInfo] = useState(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [error, setError] = useState('')

  // selections
  const [quality, setQuality] = useState('1080')
  const [videoFormat, setVideoFormat] = useState('mp4')
  const [bitrate, setBitrate] = useState('320')
  const [audioFormat, setAudioFormat] = useState('mp3')
  const [subLang, setSubLang] = useState('en')
  const [subFormat, setSubFormat] = useState('srt')

  // download job state
  const [job, setJob] = useState(null) // { status, progress, speed, downloaded, total }
  const [fileUrl, setFileUrl] = useState('')
  const pollRef = useRef(null)

  // subtitle viewer state
  const [subLines, setSubLines] = useState(null)
  const [subMeta, setSubMeta] = useState(null)
  const [subLoading, setSubLoading] = useState(false)

  useEffect(() => () => clearInterval(pollRef.current), [])

  async function handleAnalyse() {
    if (!url.trim()) { setError('Enter a YouTube URL first.'); return }
    setLoadingInfo(true); setError(''); setInfo(null)
    try {
      const d = await api.info(url.trim())
      if (d.error) { setError(d.error); return }
      setInfo(d)
    } catch {
      setError('Cannot reach backend. Is the server running?')
    } finally {
      setLoadingInfo(false)
    }
  }

  function pollJob(jobId) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const d = await api.status(jobId)
        setJob(d)
        if (d.status === 'done') {
          clearInterval(pollRef.current)
          setFileUrl(api.fileUrl(jobId))
        } else if (d.status === 'error') {
          clearInterval(pollRef.current)
          setError(d.error || 'Download failed.')
        }
      } catch {
        clearInterval(pollRef.current)
        setError('Lost connection to backend.')
      }
    }, 800)
  }

  async function handleDownload() {
    if (!url.trim()) { setError('Enter a YouTube URL first.'); return }
    if (!isYouTube(url)) { setError('That does not look like a YouTube link.'); return }
    setError(''); setFileUrl(''); setJob({ status: 'starting', progress: 0 })
    try {
      const d = tab === 'video'
        ? await api.downloadVideo(url.trim(), quality + 'p', videoFormat)
        : await api.downloadAudio(url.trim(), bitrate, audioFormat)
      if (d.error) { setError(d.error); setJob(null); return }
      pollJob(d.job_id)
    } catch {
      setError('Cannot reach backend.'); setJob(null)
    }
  }

  function stopDownload() {
    clearInterval(pollRef.current)
    setJob(null)
  }

  async function handleViewSubtitles() {
    if (!url.trim()) { setError('Enter and analyse a URL first.'); return }
    setSubLoading(true); setSubLines(null); setSubMeta(null); setError('')
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 50000)
      const d = await api.viewSubtitles(url.trim(), subLang, ctrl.signal)
      clearTimeout(t)
      if (d.error) { setError(d.error); return }
      setSubLines(d.lines || [])
      setSubMeta({ lang: d.lang, kind: d.kind, count: d.count })
    } catch (e) {
      setError(e.name === 'AbortError' ? 'Timed out. Analyse again and retry.' : 'Cannot reach backend.')
    } finally {
      setSubLoading(false)
    }
  }

  async function handleDownloadSubtitle() {
    if (!url.trim()) { setError('Enter and analyse a URL first.'); return }
    setError(''); setFileUrl(''); setJob({ status: 'starting', progress: 5 })
    try {
      const d = await api.downloadSubtitle(url.trim(), subLang, subFormat)
      if (d.error) { setError(d.error); setJob(null); return }
      pollJob(d.job_id)
    } catch {
      setError('Cannot reach backend.'); setJob(null)
    }
  }

  const busy = job && job.status !== 'done' && job.status !== 'error'

  return (
    <section className="dl section">
      <div className="container">
        <div className="dl-head">
          <div>
            <span className="eyebrow">Downloader</span>
            <h1 className="dl-title">Grab any YouTube media</h1>
          </div>
          <HealthBadge />
        </div>

        {/* URL input */}
        <div className="surface dl-url">
          <input
            className="dl-input"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyse()}
          />
          <button className="btn btn-ghost" onClick={async () => {
            try { setUrl(await navigator.clipboard.readText()) } catch { /* ignore */ }
          }}>Paste</button>
          <button className="btn btn-primary" onClick={handleAnalyse} disabled={loadingInfo}>
            {loadingInfo ? 'Analysing…' : 'Analyse'}
          </button>
        </div>

        {/* Video preview */}
        {info && (
          <div className="surface dl-preview">
            <div className="dl-thumb">
              {info.thumbnail ? <img src={info.thumbnail} alt="" /> : <div className="dl-thumb-ph" />}
            </div>
            <div className="dl-preview-meta">
              <h3 className="dl-preview-title">{info.title}</h3>
              <div className="dl-tags">
                <span className="dl-tag">{info.channel}</span>
                <span className="dl-tag">{info.duration}</span>
                <span className="dl-tag">{info.views} views</span>
                {info.has_subtitles && <span className="dl-tag positive">Captions</span>}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="dl-tabs">
          {['video', 'audio', 'subtitle'].map((t) => (
            <button
              key={t}
              className={tab === t ? 'dl-tab active' : 'dl-tab'}
              onClick={() => setTab(t)}
            >
              {t === 'video' ? 'Video' : t === 'audio' ? 'Audio' : 'Subtitles'}
            </button>
          ))}
        </div>

        {/* Video panel */}
        {tab === 'video' && (
          <div className="dl-panel">
            <label className="dl-label">Resolution</label>
            <div className="chip-grid">
              {VIDEO_QUALITIES.map((q) => (
                <button key={q} className={quality === q ? 'chip active' : 'chip'} onClick={() => setQuality(q)}>{q}p</button>
              ))}
            </div>
            <label className="dl-label">Format</label>
            <div className="chip-row">
              {VIDEO_FORMATS.map((f) => (
                <button key={f} className={videoFormat === f ? 'chip active' : 'chip'} onClick={() => setVideoFormat(f)}>{f}</button>
              ))}
            </div>
          </div>
        )}

        {/* Audio panel */}
        {tab === 'audio' && (
          <div className="dl-panel">
            <label className="dl-label">Bitrate</label>
            <div className="chip-grid">
              {AUDIO_BITRATES.map((b) => (
                <button key={b} className={bitrate === b ? 'chip active' : 'chip'} onClick={() => setBitrate(b)}>{b} kbps</button>
              ))}
            </div>
            <label className="dl-label">Format</label>
            <div className="chip-row">
              {AUDIO_FORMATS.map((f) => (
                <button key={f} className={audioFormat === f ? 'chip active' : 'chip'} onClick={() => setAudioFormat(f)}>{f}</button>
              ))}
            </div>
          </div>
        )}

        {/* Subtitle panel */}
        {tab === 'subtitle' && (
          <div className="dl-panel">
            <label className="dl-label">Language</label>
            <div className="chip-row">
              {SUB_LANGS.map((l) => (
                <button key={l.code} className={subLang === l.code ? 'chip active' : 'chip'} onClick={() => setSubLang(l.code)}>{l.label}</button>
              ))}
            </div>
            <label className="dl-label">Export format</label>
            <div className="chip-row">
              {SUB_FORMATS.map((f) => (
                <button key={f} className={subFormat === f ? 'chip active' : 'chip'} onClick={() => setSubFormat(f)}>{f}</button>
              ))}
            </div>
            <div className="dl-actions">
              <button className="btn btn-ghost" onClick={handleViewSubtitles} disabled={subLoading}>
                {subLoading ? 'Loading…' : 'View captions'}
              </button>
              <button className="btn btn-primary" onClick={handleDownloadSubtitle}>Download file</button>
            </div>
            <SubtitleViewer loading={subLoading} lines={subLines} meta={subMeta} />
          </div>
        )}

        {/* Main download action (video/audio) */}
        {tab !== 'subtitle' && (
          <div className="dl-actions">
            <button className="btn btn-primary btn-block" onClick={handleDownload} disabled={busy}>
              {busy ? 'Working…' : 'Download'}
            </button>
            {busy && <button className="btn btn-ghost" onClick={stopDownload}>Stop</button>}
          </div>
        )}

        {/* Progress */}
        {job && (
          <div className="surface dl-progress">
            <div className="dl-progress-head">
              <span>{labelForStatus(job)}</span>
              <span className="muted">{Math.round(job.progress || 0)}%</span>
            </div>
            <div className="dl-bar"><div className="dl-bar-fill" style={{ width: `${job.progress || 0}%` }} /></div>
            {job.speed && <div className="dim dl-speed">{job.speed}</div>}
            {job.status === 'done' && fileUrl && (
              <a className="btn btn-primary dl-save" href={fileUrl}>Save file</a>
            )}
          </div>
        )}

        {error && (
          <div className="dl-error">
            <span>{error}</span>
            <button className="dl-error-close" onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
      </div>
    </section>
  )
}

function labelForStatus(job) {
  switch (job.status) {
    case 'starting': return 'Connecting…'
    case 'downloading': return `Downloading ${job.downloaded || ''} / ${job.total || ''}`.trim()
    case 'processing': return 'Processing…'
    case 'done': return 'Complete'
    default: return job.status || 'Working…'
  }
}
