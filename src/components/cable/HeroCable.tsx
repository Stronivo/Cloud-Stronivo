import { useId } from 'react'
import { CableDefs, CableTube, Plug, Port } from './parts'

/**
 * Static SVG markup for the hero cable. It is animated by the self-contained engine in
 * src/intro/heroIntro.ts (inlined into the prerendered HTML), addressed through data-c
 * attributes. No state and no effects: React never re-renders it, so the engine owns
 * geometry, stroke widths and filters (desktop vs phone) from the very first frame.
 * Hidden until the engine has placed it (see [data-hero-cable] in index.css).
 */
export function HeroCable() {
  const id = useId().replace(/:/g, '')

  return (
    <svg
      data-hero-cable=""
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <CableDefs id={id} />
      {/* digital side: thin trace that comes alive once the plug is seated */}
      <path
        data-c="trace"
        fill="none"
        stroke="#c6ff4d"
        strokeWidth="1.5"
        pathLength={1}
        strokeDasharray="1"
        className="hero-trace [stroke-dashoffset:1] transition-[stroke-dashoffset] delay-300 duration-[1400ms] ease-out-expo group-[.is-connected]:[stroke-dashoffset:0]"
      />
      <path
        data-c="stream"
        fill="none"
        stroke="#f5f7f2"
        strokeWidth="1.5"
        className="stream opacity-0 transition-opacity delay-1000 duration-700 group-[.is-connected]:opacity-70"
      />
      <CableTube id={id} width={14} />
      <path
        data-c="glow"
        fill="none"
        stroke="#c6ff4d"
        strokeOpacity="0.35"
        strokeWidth="12"
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="80 1000"
        filter={`url(#${id}-glow)`}
        style={{ opacity: 0 }}
      />
      <path
        data-c="pulse"
        fill="none"
        stroke="#e9ffb8"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1000}
        strokeDasharray="80 1000"
        style={{ opacity: 0 }}
      />
      <Plug id={id} data-c="plug" />
      <Port id={id} data-c="port" />
      <circle
        data-c="flash"
        r="70"
        fill="none"
        stroke="#c6ff4d"
        strokeWidth="2"
        className="connect-flash opacity-0"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </svg>
  )
}
