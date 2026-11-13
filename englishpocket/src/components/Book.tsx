import type { CSSProperties } from 'react'
import type { ProductLook } from '../data/products'

/**
 * A real 3D book built from CSS faces (cover, spine, page block, back).
 * Lighter and sharper than WebGL for a static object, and it scales cleanly.
 * Size is controlled by --w / --h / --d on the parent (rem or px).
 */
export function Book({ look, className = '', style }: { look: ProductLook; className?: string; style?: CSSProperties }) {
  return (
    <div className={`book preserve-3d relative ${className}`} style={style}>
      {/* back */}
      <div className="book-face book-back rounded-[4px_10px_10px_4px]" style={{ background: shade(look.accent, -0.18) }} />
      {/* page block (right edge) */}
      <div className="book-face book-pages" />
      {/* top edge */}
      <div className="book-face book-top" />
      {/* spine */}
      <div className="book-face book-spine flex items-center justify-center" style={{ background: shade(look.accent, -0.12), color: look.ink }}>
        <span className="font-display text-[0.6em] font-extrabold tracking-[0.18em] uppercase [writing-mode:vertical-rl] rotate-180">
          {look.short}
        </span>
      </div>
      {/* cover */}
      <div className="book-face book-cover overflow-hidden rounded-[3px_10px_10px_3px]" style={{ background: look.accent, color: look.ink }}>
        <Cover look={look} />
        <div aria-hidden className="book-sheen pointer-events-none absolute inset-0" />
      </div>
    </div>
  )
}

function Cover({ look }: { look: ProductLook }) {
  return (
    <div className="absolute inset-0 flex flex-col p-[9%]">
      <div aria-hidden className="absolute inset-y-0 left-[5%] w-px opacity-25" style={{ background: look.ink }} />
      <div className="flex items-start justify-between pl-[6%]">
        <span className="font-display text-[0.62em] font-bold tracking-[0.2em] uppercase opacity-80">EnglishPocket</span>
        <span className="font-display text-[0.62em] font-bold opacity-80">{look.no}</span>
      </div>
      <Motif look={look} />
      <div className="mt-auto pl-[6%]">
        <p className="serif-accent text-[0.9em] leading-none opacity-80">{look.word.en}</p>
        <p className="mt-[0.35em] font-display text-[1.45em] leading-[0.98] font-extrabold tracking-[-0.03em]">{look.name}</p>
        <p className="mt-[0.7em] text-[0.5em] font-semibold tracking-[0.18em] uppercase opacity-70">PDF</p>
      </div>
    </div>
  )
}

function Motif({ look }: { look: ProductLook }) {
  const c = look.ink
  const common = 'absolute right-[-6%] top-[18%] w-[72%] opacity-90'
  switch (look.motif) {
    case 'exam':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(10 ${12 + i * 20})`}>
              <circle cx="6" cy="6" r="6" fill="none" stroke={c} strokeWidth="2" opacity=".7" />
              {i === 1 && <path d="M2.5 6.2l2.6 2.6 5-5.4" stroke={look.ink === '#FFFFFF' ? '#FFD978' : '#4978FF'} strokeWidth="2.6" fill="none" strokeLinecap="round" />}
              <rect x="18" y="4" width={50 - i * 6} height="4" rx="2" fill={c} opacity=".35" />
            </g>
          ))}
        </svg>
      )
    case 'grammar':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden>
          <text x="6" y="58" fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="58" fill={c} opacity=".95">Aa</text>
          <path d="M8 74h70M8 84h48" stroke={c} strokeWidth="2.4" strokeLinecap="round" opacity=".4" />
        </svg>
      )
    case 'work':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden>
          <rect x="12" y="30" width="62" height="44" rx="7" fill="none" stroke={c} strokeWidth="3" />
          <path d="M32 30v-8a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v8M12 48h62" stroke={c} strokeWidth="3" fill="none" />
          <circle cx="78" cy="22" r="7" fill="#4978FF" />
        </svg>
      )
    case 'talk':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden>
          <path d="M10 22h48a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H32l-12 10v-10h-10a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8z" fill={c} opacity=".9" />
          <path d="M44 50h40a7 7 0 0 1 7 7v16a7 7 0 0 1-7 7h-4v9l-10-9H44a7 7 0 0 1-7-7V57a7 7 0 0 1 7-7z" fill="#4978FF" />
          <text x="14" y="45" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="14" fill="#FFD978">Hi!</text>
        </svg>
      )
    case 'words':
      return (
        <svg viewBox="0 0 100 100" className={common} aria-hidden>
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={14 + i * 8}
              y={20 + i * 12}
              width="54"
              height="34"
              rx="5"
              fill={i === 2 ? '#FAF7F0' : 'none'}
              stroke={c}
              strokeWidth="2.4"
              opacity={0.5 + i * 0.25}
              transform={`rotate(${-8 + i * 6} 50 50)`}
            />
          ))}
          <text x="36" y="70" fontFamily="DM Serif Display, serif" fontStyle="italic" fontSize="14" fill="#17243A">word</text>
        </svg>
      )
  }
}

/** Lighten (amt>0) or darken (amt<0) a hex colour. */
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(Math.min(255, Math.max(0, amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)))
  const r = f(n >> 16)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
