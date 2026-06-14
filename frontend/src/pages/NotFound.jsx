import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="section">
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <span className="eyebrow">404</span>
        <h1 className="page-title" style={{ fontSize: 40 }}>Page not found</h1>
        <p className="muted" style={{ marginBottom: 28 }}>The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary">Back home</Link>
      </div>
    </section>
  )
}
