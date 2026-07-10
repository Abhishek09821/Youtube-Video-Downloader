export default function About() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <span className="text-xs font-semibold uppercase tracking-widest text-red-glow">
        About
      </span>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
        <span className="text-metallic">Built for simplicity</span>
      </h1>
      <p className="mt-4 text-lg text-silver">
        VDown is a personal-use tool that wraps the powerful{' '}
        <strong className="text-white">yt-dlp</strong> engine in a clean,
        distraction-free interface.
      </p>

      <div className="mt-8 space-y-4 text-silver">
        <p>
          The goal is a downloader that gets out of your way: paste a link, choose a
          format, and go. No popups, no redirects, no fake download buttons.
        </p>
        <p>
          The frontend is a React single-page application served as static files. The
          backend is a small service that orchestrates yt-dlp and streams progress back
          to the UI.
        </p>
        <p className="text-silver/60">
          VDown is intended for personal use only. Respect the rights of content owners
          and the terms of service of the platforms you download from.
        </p>
      </div>
    </section>
  )
}
