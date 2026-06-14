import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 64px - 220px)' }}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
