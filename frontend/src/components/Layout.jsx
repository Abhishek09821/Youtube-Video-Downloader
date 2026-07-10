import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-900">
      {/* Ambient red glow backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(229,9,20,0.10), transparent 60%)',
        }}
      />
      {/* Subtle circuit grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(229,9,20,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(229,9,20,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <Navbar />
      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
