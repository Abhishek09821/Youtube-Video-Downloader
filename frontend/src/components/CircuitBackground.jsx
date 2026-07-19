import { ambientGlow, circuitGrid, circuitTextureUrl } from '../theme/tokens.js'

/**
 * Shared environment texture used by BOTH the splash overlay and the app
 * layout so the two feel like one continuous product. Renders:
 *   1. ambient red wash (top)
 *   2. fine circuit grid (~4%)
 *   3. radiating circuit-trace texture (~10%)
 *
 * `fixed` (default) pins it to the viewport for the app shell.
 * Set fixed={false} for use inside a self-contained overlay like the splash.
 */
export default function CircuitBackground({ fixed = true }) {
  const pos = fixed ? 'fixed' : 'absolute'
  return (
    <div aria-hidden="true" className={`pointer-events-none ${pos} inset-0 -z-10 overflow-hidden`}>
      {/* ambient red glow */}
      <div className="absolute inset-0" style={{ background: ambientGlow }} />
      {/* fine circuit grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={circuitGrid} />
      {/* radiating circuit traces */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{ backgroundImage: circuitTextureUrl, backgroundSize: '260px 260px' }}
      />
      {/* vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  )
}
