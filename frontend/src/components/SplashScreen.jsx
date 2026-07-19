import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Logo from './Logo.jsx'
import CircuitBackground from './CircuitBackground.jsx'
import { colors, splash } from '../theme/tokens.js'

/**
 * Fullscreen intro overlay (fixed, z-50). Shares background + circuit texture
 * with the app so the transition feels continuous. Total ~3.5s, then fades /
 * scales away to reveal the app. Honors prefers-reduced-motion (fade only).
 */
export default function SplashScreen({ onDone }) {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), splash.total * 1000)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-900"
          initial={{ opacity: 1 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.5 } }
              : { opacity: 0, scale: 1.04, transition: { duration: 0.6, ease: 'easeInOut' } }
          }
        >
          {/* Same environment texture as the dashboard */}
          <CircuitBackground fixed={false} />

          {/* Logo */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={
              reduce
                ? { duration: 0.6 }
                : { duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <Logo
              id="splash"
              size={168}
              animateTraces={!reduce}
              breathe={!reduce}
              className="drop-shadow-[0_0_30px_rgba(255,30,46,0.35)]"
            />
          </motion.div>

          {/* Wordmark */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0, y: reduce ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reduce ? 0.2 : 1.0 }}
          >
            <h1 className="font-display text-4xl font-bold tracking-widest sm:text-5xl">
              <span className="text-metallic">V</span>
              <span className="text-metallic-red">Down</span>
            </h1>
            <p
              className="mt-3 text-xs font-medium uppercase tracking-[0.4em]"
              style={{ color: colors.silver }}
            >
              Media Engine
            </p>
          </motion.div>

          {/* Loading sweep */}
          {!reduce && (
            <motion.div
              className="mt-10 h-[3px] w-40 overflow-hidden rounded-full bg-white/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.4 }}
            >
              <motion.div
                className="h-full w-1/3 rounded-full"
                style={{ backgroundColor: colors.accent, boxShadow: '0 0 12px rgba(255,30,46,0.6)' }}
                initial={{ x: '-120%' }}
                animate={{ x: '360%' }}
                transition={{ delay: 1.2, duration: 1.4, ease: 'easeInOut' }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
