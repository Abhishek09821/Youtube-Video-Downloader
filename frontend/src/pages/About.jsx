import './content.css'

export default function About() {
  return (
    <section className="section">
      <div className="container narrow">
        <span className="eyebrow">About</span>
        <h1 className="page-title">Built for simplicity</h1>
        <p className="muted page-lede">
          VIDown is a personal-use tool that wraps the powerful
          <strong> yt-dlp</strong> engine in a clean, distraction-free interface.
        </p>
        <div className="prose muted">
          <p>
            The goal is a downloader that gets out of your way: paste a link, choose a
            format, and go. No popups, no redirects, no fake download buttons.
          </p>
          <p>
            The frontend is a React single-page application served as static files. The
            backend is a small Flask service that orchestrates yt-dlp and streams
            progress back to the UI.
          </p>
          <p className="dim">
            VIDown is intended for personal use only. Respect the rights of content
            owners and the terms of service of the platforms you download from.
          </p>
        </div>
      </div>
    </section>
  )
}
