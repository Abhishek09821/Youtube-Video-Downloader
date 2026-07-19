import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import Home from './pages/Home.jsx'
import Download from './pages/Download.jsx'
import Features from './pages/Features.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  // Show the splash once per browser session.
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem('vdown-splash-seen'),
  )

  const finishSplash = () => {
    sessionStorage.setItem('vdown-splash-seen', '1')
    setShowSplash(false)
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={finishSplash} />}
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/download" element={<Download />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
