const features = [
  { title: 'Video up to 4K', text: 'Download 144p through 2160p in MP4, MKV or WebM containers.' },
  { title: 'Audio extraction', text: 'Pull audio at up to 320kbps as MP3, FLAC, WAV, AAC or OGG.' },
  { title: 'Smart captions', text: 'Falls back to auto-generated captions when no manual track exists.' },
  { title: 'Live progress', text: 'Real-time download speed and percentage via job polling.' },
  { title: 'Subtitle viewer', text: 'Read captions in-browser with timestamps, or export to SRT, VTT or TXT.' },
  { title: 'Lightweight', text: 'A single backend and a static React frontend. No accounts, no tracking.' },
]

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <span className="text-xs font-semibold uppercase tracking-widest text-red-glow">
        Capabilities
      </span>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
        <span className="text-metallic">Everything VDown can do</span>
      </h1>
      <p className="mt-3 max-w-xl text-silver">
        A focused feature set, built around speed and clarity.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass group rounded-2xl border-l-2 border-l-red-brand/40 p-6 transition-all duration-300 hover:border-l-red-glow hover:shadow-glow-sm"
          >
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-silver">{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
