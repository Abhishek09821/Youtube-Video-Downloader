import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import CircuitBackground from './CircuitBackground.jsx'

export default function Layout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-900">
      {/* Shared environment texture (same as splash) */}
      <CircuitBackground />
      <Navbar />
      <main className="min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
