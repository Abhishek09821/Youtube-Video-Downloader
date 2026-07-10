import { useEffect, useState } from 'react'
import { api } from '../hooks/useApi.js'

export default function HealthBadge() {
  const [online, setOnline] = useState(null)

  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const r = await api.health()
        if (active) setOnline(r.ok)
      } catch {
        if (active) setOnline(false)
      }
    }
    check()
    const id = setInterval(check, 15000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const label =
    online === null ? 'Checking engine…' : online ? 'Engine online' : 'Engine offline'

  const dot =
    online === null
      ? 'bg-silver animate-pulse'
      : online
        ? 'bg-red-glow shadow-glow-sm'
        : 'bg-silver/40'

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-ink-700/80 px-3.5 py-1.5 text-xs font-medium text-silver backdrop-blur-md">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </div>
  )
}
