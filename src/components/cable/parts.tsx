import { forwardRef, type Ref } from 'react'

/**
 * Physical cable language shared across the site.
 * Everything is drawn in local coordinates so it can be placed with a single transform:
 *  - <Plug/> points to +x. The metal tip ends at x = 0, the cable enters at x = -PLUG_LEN.
 *  - <Port/> has its socket face at x = 0, centred on y = 0, and extends to +x.
 */
export const PLUG_LEN = 150
export const PLUG_INSERT = 24 // how deep the tip travels past the port face once connected

export function CableDefs({ id, filters = true }: { id: string; filters?: boolean }) {
  return (
    <defs>
      <linearGradient id={`${id}-housing`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#59616d" />
        <stop offset="0.18" stopColor="#353b45" />
        <stop offset="0.62" stopColor="#1d2128" />
        <stop offset="1" stopColor="#0d0f13" />
      </linearGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2f4f7" />
        <stop offset="0.3" stopColor="#b6bcc5" />
        <stop offset="0.55" stopColor="#6b727c" />
        <stop offset="0.8" stopColor="#c7ccd3" />
        <stop offset="1" stopColor="#7f868f" />
      </linearGradient>
      <linearGradient id={`${id}-relief`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3d434d" />
        <stop offset="0.45" stopColor="#1f232a" />
        <stop offset="1" stopColor="#0a0c0f" />
      </linearGradient>
      <linearGradient id={`${id}-block`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#3a414c" />
        <stop offset="0.35" stopColor="#252a32" />
        <stop offset="1" stopColor="#13161b" />
      </linearGradient>
      <linearGradient id={`${id}-collar`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8b929c" />
        <stop offset="0.5" stopColor="#3a4049" />
        <stop offset="1" stopColor="#626973" />
      </linearGradient>
      <radialGradient id={`${id}-halo`}>
        <stop offset="0" stopColor="#c6ff4d" stopOpacity="0.55" />
        <stop offset="0.45" stopColor="#c6ff4d" stopOpacity="0.12" />
        <stop offset="1" stopColor="#c6ff4d" stopOpacity="0" />
      </radialGradient>
      {filters && (
        <>
          <filter id={`${id}-shadow`} x="-20%" y="-50%" width="140%" height="250%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id={`${id}-drop`} x="-30%" y="-60%" width="160%" height="260%">
            <feDropShadow dx="0" dy="16" stdDeviation="10" floodColor="#000" floodOpacity="0.55" />
          </filter>
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </>
      )}
    </defs>
  )
}

type PlugProps = { id: string; filters?: boolean; className?: string; 'data-c'?: string }

export const Plug = forwardRef(function Plug({ id, filters = true, className, 'data-c': dataC }: PlugProps, ref: Ref<SVGGElement>) {
  return (
    <g ref={ref} className={className} data-c={dataC}>
      <g filter={filters ? `url(#${id}-drop)` : undefined}>
        {/* strain relief with ridges */}
        <path d="M-150 -8 L-108 -13 L-108 13 L-150 8 Z" fill={`url(#${id}-relief)`} />
        {[-142, -134, -126, -118].map((x) => (
          <line key={x} x1={x} x2={x} y1={-8 - (x + 150) * 0.12} y2={8 + (x + 150) * 0.12} stroke="#000" strokeOpacity="0.5" strokeWidth="1.4" />
        ))}
        {/* housing */}
        <rect x="-110" y="-22" width="76" height="44" rx="10" fill={`url(#${id}-housing)`} />
        <rect x="-108.5" y="-20.5" width="73" height="41" rx="9" fill="none" stroke="#fff" strokeOpacity="0.08" />
        <path d="M-100 -18.5 H-46" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
        {/* grip lines */}
        {[-96, -90, -84].map((x) => (
          <line key={x} x1={x} x2={x} y1="-10" y2="10" stroke="#000" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
        ))}
        {/* brand stripe — lights up once connected */}
        <rect x="-74" y="-2" width="30" height="4" rx="2" fill="#3a414c" />
        <rect
          x="-74"
          y="-2"
          width="30"
          height="4"
          rx="2"
          className="fill-lime opacity-0 transition-opacity duration-500 group-[.is-connected]:opacity-100"
        />
        {/* metal connector */}
        <rect x="-36" y="-13" width="36" height="26" rx="3.5" fill={`url(#${id}-metal)`} />
        <rect x="-30" y="-5" width="24" height="10" rx="2" fill="#16191e" />
        <rect x="-26" y="-3" width="6" height="6" rx="1" fill="#9aa1ab" />
        <rect x="-15" y="-3" width="6" height="6" rx="1" fill="#9aa1ab" />
      </g>
    </g>
  )
})

type PortProps = { id: string; filters?: boolean; className?: string; label?: string; 'data-c'?: string }

export const Port = forwardRef(function Port(
  { id, filters = true, className, label = 'PORT · 01', 'data-c': dataC }: PortProps,
  ref: Ref<SVGGElement>,
) {
  return (
    <g ref={ref} className={className} data-c={dataC}>
      {/* halo once lit */}
      <ellipse
        cx="60"
        cy="0"
        rx="210"
        ry="150"
        fill={`url(#${id}-halo)`}
        className="opacity-0 transition-opacity duration-1000 group-[.is-connected]:opacity-100"
      />
      <g filter={filters ? `url(#${id}-drop)` : undefined}>
        <rect x="0" y="-66" width="172" height="132" rx="22" fill={`url(#${id}-block)`} />
        <rect x="1" y="-65" width="170" height="130" rx="21" fill="none" stroke="#fff" strokeOpacity="0.09" />
        <path d="M18 -63.5 H150" stroke="#fff" strokeOpacity="0.22" strokeLinecap="round" />
        {/* side bevel to give depth */}
        <rect x="150" y="-60" width="16" height="120" rx="8" fill="#0b0d10" fillOpacity="0.55" />
      </g>
      {/* LED light bar */}
      <rect x="38" y="-38" width="4" height="76" rx="2" fill="#2f353f" />
      <rect
        x="38"
        y="-38"
        width="4"
        height="76"
        rx="2"
        className="fill-lime opacity-0 transition-opacity duration-500 group-[.is-connected]:opacity-100"
      />
      <rect
        x="34"
        y="-42"
        width="12"
        height="84"
        rx="6"
        className="fill-lime opacity-0 transition-opacity duration-700 group-[.is-connected]:opacity-30"
        filter={filters ? `url(#${id}-glow)` : undefined}
      />
      {/* status dots */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={62 + i * 14} cy="28" r="3.2" fill="#3a414c" />
          <circle
            cx={62 + i * 14}
            cy="28"
            r="3.2"
            className="fill-lime opacity-0 transition-opacity duration-300 group-[.is-connected]:opacity-100"
            style={{ transitionDelay: `${300 + i * 140}ms` }}
          />
        </g>
      ))}
      <text x="60" y="-30" fill="#a4abb5" fontSize="10" fontFamily="'Space Grotesk Variable', sans-serif" letterSpacing="2">
        {label}
      </text>
      <g fontSize="17" fontWeight="600" fontFamily="'Space Grotesk Variable', sans-serif">
        <text x="60" y="-2" fill="#5b636e" className="transition-opacity duration-300 group-[.is-connected]:opacity-0">
          offline
        </text>
        <text x="60" y="-2" fill="#f5f7f2" className="opacity-0 transition-opacity duration-500 group-[.is-connected]:opacity-100">
          online
        </text>
      </g>
      {/* metal collar + socket opening (drawn above the plug tip) */}
      <rect x="-12" y="-25" width="30" height="50" rx="7" fill={`url(#${id}-collar)`} />
      <rect x="-12" y="-16" width="16" height="32" rx="3" fill="#050608" />
      <rect
        x="-14"
        y="-27"
        width="34"
        height="54"
        rx="9"
        fill="none"
        strokeWidth="1.5"
        className="stroke-lime opacity-0 transition-opacity duration-500 group-[.is-connected]:opacity-100"
      />
    </g>
  )
})

/** Layered strokes that read as a rubber-coated cable. All share the same path data. */
export function CableTube({
  id,
  filters = true,
  width = 14,
  shadowRef,
  outerRef,
  bodyRef,
  sheenRef,
}: {
  id: string
  filters?: boolean
  width?: number
  shadowRef?: Ref<SVGPathElement>
  outerRef?: Ref<SVGPathElement>
  bodyRef?: Ref<SVGPathElement>
  sheenRef?: Ref<SVGPathElement>
}) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        ref={shadowRef}
        data-c="shadow"
        stroke="#000"
        strokeOpacity={filters ? 0.55 : 0.3}
        strokeWidth={width * 1.3}
        transform="translate(0 20)"
        filter={filters ? `url(#${id}-shadow)` : undefined}
      />
      <path ref={outerRef} data-c="outer" stroke="#06070a" strokeWidth={width + 2} />
      <path ref={bodyRef} data-c="body" stroke="#2a3039" strokeWidth={width - 1} />
      <path ref={sheenRef} data-c="sheen" stroke="#ffffff" strokeOpacity="0.17" strokeWidth={Math.max(1.5, width * 0.22)} transform="translate(-1 -3)" />
    </g>
  )
}
