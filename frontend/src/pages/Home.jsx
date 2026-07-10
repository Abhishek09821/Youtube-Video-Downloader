import { Link } from 'react-router-dom'

const stats = [
  { value: '4K', label: 'Max resolution' },
  { value: '320kbps', label: 'Audio quality' },
  { value: '100+', label: 'Caption languages' },
]

const steps = [
  { n: '01', title: 'Paste a link', text: 'Drop any YouTube or video URL into the input field.' },
  { n: '02', title: 'Pick a format', text: 'Choose video resolution, audio bitrate, or captions.' },
  { n: '03', title: 'Download', text: 'Track progress live and save the file when ready.' },
]

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-red-glow/20 bg-red-brand/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-red-glow">
          Media downloader
        </span>
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.1] sm:text-6xl">
          <span className="text-metallic">Download video, audio</span>
          <br />
          <span className="text-metallic">and captions.</span>{' '}
          <span className="text-metallic-red">Fast &amp; clean.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-silver">
          VDown is a high-speed engine over yt-dlp. Grab up to 4K video, studio-grade
          audio, or accurate subtitles from YouTube, Instagram, X, Reddit, TikTok and
          more — cybernetic, precise, no clutter.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link to="/download" className="btn-red px-6 py-3">
            Open the app
          </Link>
          <Link to="/features" className="btn-outline px-6 py-3">
            See features
          </Link>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="glass rounded-xl px-4 py-6 transition-shadow duration-300 hover:shadow-glow-sm"
            >
              <div className="text-2xl font-bold text-metallic-red sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs text-silver">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="glass group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:border-red-glow/30 hover:shadow-glow-sm"
            >
              <span className="text-5xl font-bold text-white/5 transition-colors group-hover:text-red-brand/20">
                {s.n}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-silver">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
