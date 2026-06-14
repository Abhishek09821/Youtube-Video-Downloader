import { useEffect, useState } from 'react'
import { api } from '../hooks/useApi.js'
import './healthbadge.css'

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
    return () => { active = false; clearInterval(id) }
  }, [])

  const label = online === null ? 'Checking backend…' : online ? 'Backend online' : 'Backend offline'
  const cls = online === null ? 'health' : online ? 'health on' : 'health off'

  return (
    <div className={cls}>
      <span className="health-dot" />
      <span>{label}</span>
    </div>
  )
}
