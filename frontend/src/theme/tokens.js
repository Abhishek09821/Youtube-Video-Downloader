// ============================================================================
// VDown design tokens — single source of truth for the cyberpunk-tech theme.
// Reuse these constants instead of duplicating hex values / gradients / motion.
// Tailwind mirrors the color names in tailwind.config.js.
// ============================================================================

export const colors = {
  bg: '#0a0a0a', // app background
  surface1: '#0d0d0d', // deep panels / inputs
  surface2: '#151515', // raised glass cards
  accent: '#ff1e2e', // primary accent
  accentHover: '#e11d2e', // hover accent
  accentDeep: '#9e0018', // gradient shadow end
  cardBorder: 'rgba(255,30,46,0.15)', // soft red card border
  metalFrom: '#2b2b2b',
  metalTo: '#3f3f3f',
  silver: '#a0a0b0',
}

// Shared ambient red wash used behind splash + dashboard so lighting matches.
export const ambientGlow =
  'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(255,30,46,0.12), transparent 60%)'

// Circuit-board grid texture (subtle, ~10% opacity applied by the layer).
export const circuitGrid = {
  backgroundImage:
    'linear-gradient(rgba(255,30,46,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,30,46,0.6) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
}

// Reusable inline SVG circuit-trace texture (nodes + traces) as a data URI.
// Used identically by the splash overlay and the app background layer.
const circuitSvg = `
<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260' viewBox='0 0 260 260'>
  <g fill='none' stroke='%23ff1e2e' stroke-width='1.5' stroke-linecap='round'>
    <path d='M10 40 H70 V90 H120'/>
    <path d='M250 60 H190 V130 H140'/>
    <path d='M40 250 V190 H110 V150'/>
    <path d='M220 250 V200 H160'/>
    <path d='M10 160 H60 V220'/>
  </g>
  <g fill='%23ff1e2e'>
    <circle cx='120' cy='90' r='3'/>
    <circle cx='140' cy='130' r='3'/>
    <circle cx='110' cy='150' r='3'/>
    <circle cx='160' cy='200' r='3'/>
    <circle cx='60' cy='220' r='3'/>
    <circle cx='70' cy='40' r='3'/>
  </g>
</svg>`

export const circuitTextureUrl = `url("data:image/svg+xml,${encodeURIComponent(
  circuitSvg.trim(),
)}")`

// ---------------------------------------------------------------------------
// Shared class-string tokens (compose in JSX so styles stay consistent).
// Component-level classes (.glass, .btn-red, .btn-outline, .card, .chip) live
// in styles/global.css; these are helpers for layout-level composition.
// ---------------------------------------------------------------------------
export const cx = {
  section: 'mx-auto max-w-6xl px-6',
  eyebrow:
    'inline-flex items-center gap-2 rounded-full border border-red-glow/20 bg-red-brand/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-red-glow',
}

// Splash motion timeline (seconds) — keep in one place so timings stay in sync.
export const splash = {
  total: 3.5,
  traceDraw: 1.0,
  exitStart: 2.9,
}
