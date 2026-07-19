import { motion } from 'framer-motion'

/**
 * VDown metallic badge logo — real SVG (no image).
 * Rounded-square metallic badge, corner rivets, metallic "V" + download arrow,
 * and circuit traces radiating outward that can draw in via stroke-dashoffset.
 *
 * Props:
 *   size          number  – rendered px (default 40)
 *   animateTraces bool    – draw the outer circuit traces on mount (splash)
 *   breathe       bool    – breathing red glow (splash / hero)
 *   className     string
 */
export default function Logo({
  size = 40,
  animateTraces = false,
  breathe = false,
  className = '',
  id = 'v',
}) {
  // Unique gradient/filter ids so multiple logos on one page don't collide.
  const uid = (n) => `${n}-${id}`

  // Outer circuit traces (drawn in on splash). Endpoint node coords paired.
  const traces = [
    { d: 'M 128 150 L 60 150 L 60 72 L 92 72', node: [92, 72] },
    { d: 'M 128 350 L 60 350 L 60 428 L 34 428', node: [34, 428] },
    { d: 'M 372 150 L 440 150 L 440 72 L 408 72', node: [408, 72] },
    { d: 'M 372 350 L 440 350 L 440 428 L 466 428', node: [466, 428] },
  ]

  const traceAnim = animateTraces
    ? {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 0.85 },
        transition: { duration: 1, delay: 0.35, ease: 'easeInOut' },
      }
    : {}

  return (
    <motion.svg
      viewBox="0 0 500 500"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={`${breathe ? 'animate-breathe' : ''} ${className}`}
      aria-label="VDown logo"
      role="img"
    >
      <defs>
        <radialGradient id={uid('bg')} cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="60%" stopColor="#0d0d0d" />
          <stop offset="100%" stopColor="#040404" />
        </radialGradient>
        <linearGradient id={uid('frame')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3f3f3f" />
          <stop offset="45%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#080808" />
        </linearGradient>
        <linearGradient id={uid('v')} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff5560" />
          <stop offset="55%" stopColor="#ff1e2e" />
          <stop offset="100%" stopColor="#9e0018" />
        </linearGradient>
        <linearGradient id={uid('arrow')} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f2f2f2" />
          <stop offset="100%" stopColor="#7c7c7c" />
        </linearGradient>
        <radialGradient id={uid('rivet')} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffb3b8" />
          <stop offset="35%" stopColor="#ff1e2e" />
          <stop offset="100%" stopColor="#4a0009" />
        </radialGradient>
        <filter id={uid('glow')} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={uid('glowBig')} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="20" />
        </filter>
        <clipPath id={uid('clip')}>
          <rect x="112" y="112" width="276" height="276" rx="50" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="500" height="500" rx="95" fill={`url(#${uid('bg')})`} />
      <circle cx="250" cy="250" r="150" fill="#ff1e2e" opacity="0.32" filter={`url(#${uid('glowBig')})`} />

      {/* outer circuit traces */}
      <g stroke="#ff1e2e" strokeWidth="2.5" fill="none" strokeLinecap="round" filter={`url(#${uid('glow')})`}>
        {traces.map((t, i) => (
          <motion.path key={i} d={t.d} opacity={0.85} {...traceAnim} />
        ))}
      </g>
      <g fill="#ff1e2e" filter={`url(#${uid('glow')})`}>
        {traces.map((t, i) => (
          <motion.circle
            key={i}
            cx={t.node[0]}
            cy={t.node[1]}
            r="5"
            initial={animateTraces ? { opacity: 0, scale: 0 } : false}
            animate={animateTraces ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.3, delay: 1.1 }}
            style={{ transformOrigin: `${t.node[0]}px ${t.node[1]}px` }}
          />
        ))}
      </g>

      {/* badge frame */}
      <rect x="112" y="112" width="276" height="276" rx="50" fill={`url(#${uid('frame')})`} stroke="#4d4d4d" strokeWidth="2" />
      <rect x="112" y="112" width="276" height="276" rx="50" fill="none" stroke="#ff1e2e" strokeWidth="1.5" opacity="0.4" />

      {/* fine internal PCB texture, clipped to badge */}
      <g clipPath={`url(#${uid('clip')})`} stroke="#ff1e2e" strokeWidth="1" opacity="0.14">
        <path d="M 112 190 H 388" />
        <path d="M 112 230 H 388" />
        <path d="M 112 270 H 388" />
        <path d="M 112 310 H 388" />
        <path d="M 170 112 V 388" />
        <path d="M 330 112 V 388" />
      </g>

      <circle cx="250" cy="250" r="110" fill="none" stroke="#3d3d3d" strokeWidth="4" />
      <circle cx="250" cy="250" r="110" fill="none" stroke="#ff1e2e" strokeWidth="1.5" opacity="0.55" filter={`url(#${uid('glow')})`} />

      {/* corner rivets */}
      <circle cx="150" cy="150" r="11" fill={`url(#${uid('rivet')})`} filter={`url(#${uid('glow')})`} />
      <circle cx="350" cy="150" r="11" fill={`url(#${uid('rivet')})`} filter={`url(#${uid('glow')})`} />
      <circle cx="150" cy="350" r="11" fill={`url(#${uid('rivet')})`} filter={`url(#${uid('glow')})`} />
      <circle cx="350" cy="350" r="11" fill={`url(#${uid('rivet')})`} filter={`url(#${uid('glow')})`} />

      {/* metallic V */}
      <path
        d="M 188 165 L 250 302 L 312 165"
        fill="none"
        stroke={`url(#${uid('v')})`}
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${uid('glow')})`}
      />

      {/* download arrow at the V's vertex */}
      <g>
        <rect x="240" y="222" width="20" height="34" rx="4" fill={`url(#${uid('arrow')})`} />
        <polygon points="222,250 278,250 250,290" fill={`url(#${uid('arrow')})`} />
      </g>
    </motion.svg>
  )
}
