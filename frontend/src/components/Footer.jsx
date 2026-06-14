import { Link } from 'react-router-dom'
import './footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand"><span className="brand-mark">VI</span><span className="brand-name">Down</span></span>
          <p className="muted footer-tag">A fast, minimal interface for downloading video, audio and captions.</p>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/download">Download</Link>
            <Link to="/features">Features</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/about">About</Link>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span className="dim">© {new Date().getFullYear()} VIDown · yt-dlp powered · Personal use only</span>
      </div>
    </footer>
  )
}
