import { NavLink, Link } from 'react-router-dom'
import './navbar.css'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/download', label: 'Download' },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">VI</span>
          <span className="brand-name">Down</span>
        </Link>
        <nav className="nav-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/download" className="btn btn-primary nav-cta">Open App</Link>
      </div>
    </header>
  )
}
