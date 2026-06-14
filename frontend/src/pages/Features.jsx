import './content.css'

const features = [
  { title: 'Video up to 4K', text: 'Download in 144p through 2160p, in MP4, MKV or WebM containers.' },
  { title: 'Audio extraction', text: 'Pull audio at up to 320kbps as MP3, FLAC, WAV, AAC or OGG.' },
  { title: 'Smart captions', text: 'Falls back to YouTube auto-generated captions when no manual track exists.' },
  { title: 'Live progress', text: 'Real-time download speed and percentage via job polling.' },
  { title: 'Subtitle viewer', text: 'Read captions in-browser with timestamps, or export to SRT, VTT or TXT.' },
  { title: 'Lightweight', text: 'A single backend and a static React frontend. No accounts, no tracking.' },
]

export default function Features() {
  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">Capabilities</span>
        <h1 className="page-title">Everything VIDown can do</h1>
        <p className="muted page-lede">A focused feature set, built around speed and clarity.</p>
        <div className="feature-grid grid">
          {features.map((f) => (
            <div className="surface feature-card" key={f.title}>
              <h3>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
