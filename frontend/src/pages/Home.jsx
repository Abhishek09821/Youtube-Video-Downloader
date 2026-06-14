import { Link } from 'react-router-dom'
import './home.css'

const stats = [
  { value: '4K', label: 'Max resolution' },
  { value: '320kbps', label: 'Audio quality' },
  { value: '100+', label: 'Caption languages' },
]

const steps = [
  { n: '01', title: 'Paste a link', text: 'Drop any YouTube URL into the input field.' },
  { n: '02', title: 'Pick a format', text: 'Choose video resolution, audio bitrate, or captions.' },
  { n: '03', title: 'Download', text: 'Track progress live and save the file when ready.' },
]

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">YouTube downloader</span>
          <h1 className="hero-title">
            Download video, audio and captions.<br />
            <span className="hero-accent">Clean, fast, no clutter.</span>
          </h1>
          <p className="hero-sub muted">
            VIDown is a minimal interface over yt-dlp. Grab up to 4K video,
            studio-grade audio, or subtitles in any available language — without the noise.
          </p>
          <div className="hero-actions">
            <Link to="/download" className="btn btn-primary">Open the app</Link>
            <Link to="/features" className="btn btn-ghost">See features</Link>
          </div>
          <div className="hero-stats">
            {stats.map((s) => (
              <div className="hero-stat" key={s.label}>
                <div className="hero-stat-value">{s.value}</div>
                <div className="hero-stat-label dim">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="steps grid">
            {steps.map((s) => (
              <div className="surface step" key={s.n}>
                <span className="step-n">{s.n}</span>
                <h3 className="step-title">{s.title}</h3>
                <p className="muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
