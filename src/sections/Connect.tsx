import { useCallback, useId, useRef } from 'react'
import { CableDefs, CableTube, Plug, Port, PLUG_INSERT, PLUG_LEN } from '../components/cable/parts'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { useMedia, useReducedMotion } from '../hooks/useMedia'
import { easeInOutCubic, range } from '../lib/math'

const VB = { w: 800, h: 300 }
const S = 0.62 // plug & port scale inside this scene
const PORT_X = 668
const Y = 150
const START_X = -44 // reaches back to the jack on the "Twój biznes" node

function geometry(p: number) {
  const tipStart = 250
  const tipEnd = PORT_X + PLUG_INSERT * S
  const k = easeInOutCubic(range(p, 0.08, 0.78))
  const tipX = tipStart + (tipEnd - tipStart) * k
  const endX = tipX - PLUG_LEN * S
  // slack cable that tightens as the plug travels toward the port
  const sag = 70 * (1 - k) + 8
  const x0 = START_X
  const mx = (x0 + endX) / 2
  const h = (endX - x0) * 0.22
  const d = `M${x0} ${Y} C${x0 + h} ${Y}, ${mx - h} ${Y + sag}, ${mx} ${Y + sag} S${endX - h} ${Y}, ${endX} ${Y}`
  return { d, tipX, connected: p >= 0.8 }
}

export function Connect() {
  const id = useId().replace(/:/g, '')
  const reduced = useReducedMotion()
  const wide = useMedia('(min-width: 768px)')
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const shadow = useRef<SVGPathElement>(null)
  const outer = useRef<SVGPathElement>(null)
  const body = useRef<SVGPathElement>(null)
  const sheen = useRef<SVGPathElement>(null)
  const plug = useRef<SVGGElement>(null)
  const meter = useRef<HTMLSpanElement>(null)
  const message = useRef<HTMLParagraphElement>(null)
  const last = useRef(-1)

  const apply = useCallback(
    (p: number) => {
      if (Math.abs(p - last.current) < 0.001) return
      last.current = p
      const g = geometry(p)
      for (const r of [shadow, outer, body, sheen]) r.current?.setAttribute('d', g.d)
      plug.current?.setAttribute('transform', `translate(${g.tipX.toFixed(1)} ${Y}) scale(${S})`)
      if (meter.current) meter.current.textContent = g.connected ? 'połączono' : `${Math.round(range(p, 0.08, 0.78) * 100)}%`
      section.current?.classList.toggle('is-connected', g.connected)
      message.current?.classList.toggle('is-in', g.connected)
    },
    [],
  )

  const onProgress = useCallback((p: number) => apply(reduced ? 1 : p), [apply, reduced])
  useScrollProgress(track, onProgress, { start: 0, end: 1 })

  return (
    <section
      ref={section}
      aria-labelledby="connect-title"
      className={`group relative border-t border-line/60 ${reduced ? '' : 'h-[260vh]'}`}
    >
      <div ref={track} className={reduced ? '' : 'absolute inset-0'} aria-hidden />
      <div className={`${reduced ? 'py-28' : 'sticky top-0 h-[100svh]'} flex flex-col justify-center overflow-hidden`}>
        <div className="container-x">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow mb-5">
                <span className="text-lime">03</span> — Połącz się z przyszłością
              </p>
              <h2 id="connect-title" className="max-w-[16ch] text-[clamp(2rem,4.6vw,4.25rem)] font-semibold leading-[1] tracking-[-0.04em]">
                Twój biznes. Świat online. Jeden przewód.
              </h2>
            </div>
            <p className="hidden shrink-0 font-display text-sm text-mist md:block" aria-hidden>
              status: <span ref={meter} className="tabular-nums text-paper group-[.is-connected]:text-lime">0%</span>
            </p>
          </div>

          <div className="mt-12 grid grid-cols-[minmax(0,1fr)_minmax(0,2.6fr)_minmax(0,1fr)] items-start gap-2 md:mt-20 md:gap-6">
            {/* Your business */}
            <Node label="Twój biznes" sub="realny świat" align="end" jack>
              <svg viewBox="0 0 64 64" className="size-full" aria-hidden>
                <path d="M10 26 L14 12 H50 L54 26" fill="none" stroke="#f5f7f2" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M10 26 q5.5 7 11 0 q5.5 7 11 0 q5.5 7 11 0 q5.5 7 11 0" fill="none" stroke="#f5f7f2" strokeWidth="2.5" />
                <path d="M14 31 V52 H50 V31" fill="none" stroke="#f5f7f2" strokeWidth="2.5" strokeLinejoin="round" />
                <rect x="27" y="38" width="10" height="14" fill="none" stroke="#c6ff4d" strokeWidth="2.5" />
              </svg>
            </Node>

            <div className="relative mt-[calc(2rem-18.75%)] sm:mt-[calc(3rem-18.75%)] md:mt-[calc(4rem-18.75%)]">
              <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full overflow-visible" aria-hidden>
                <CableDefs id={id} filters={wide} />
                <CableTube
                  id={id}
                  filters={wide}
                  width={9}
                  shadowRef={shadow}
                  outerRef={outer}
                  bodyRef={body}
                  sheenRef={sheen}
                />
                <Plug ref={plug} id={id} filters={wide} />
                <g transform={`translate(${PORT_X} ${Y}) scale(${S})`}>
                  <Port id={id} filters={wide} label="INTERNET" />
                </g>
              </svg>
            </div>

            {/* Online world */}
            <Node label="Świat online" sub="Twoi klienci" align="start" lit>
              <svg viewBox="0 0 64 64" className="size-full" aria-hidden>
                <circle cx="32" cy="32" r="21" fill="none" stroke="#f5f7f2" strokeWidth="2.5" />
                <ellipse cx="32" cy="32" rx="9" ry="21" fill="none" stroke="#f5f7f2" strokeWidth="2.5" />
                <path d="M11 32 H53 M15 21 H49 M15 43 H49" fill="none" stroke="#f5f7f2" strokeWidth="2" />
                <circle cx="32" cy="32" r="27" fill="none" strokeWidth="1.5" className="stroke-transparent transition-[stroke] duration-700 group-[.is-connected]:stroke-lime" />
              </svg>
            </Node>
          </div>

          <p
            ref={message}
            className="mx-auto mt-14 max-w-4xl text-center font-display text-[clamp(1.6rem,3.8vw,3.4rem)] font-medium leading-[1.08] tracking-[-0.035em] md:mt-20"
          >
            {'Dobra strona to początek większych możliwości.'.split(' ').map((w, i, a) => (
              <span key={i}>
                <span className="split-word">
                  <span style={{ '--i': i } as React.CSSProperties}>{w}</span>
                </span>
                {i < a.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}

function Node({
  label,
  sub,
  children,
  lit = false,
  jack = false,
  align,
}: {
  label: string
  sub: string
  children: React.ReactNode
  lit?: boolean
  jack?: boolean
  align: 'start' | 'end'
}) {
  return (
    <div className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
    <div className="flex flex-col items-center text-center">
      <div
        className={`relative flex size-16 items-center justify-center rounded-2xl border border-line bg-surface/60 p-3 transition-[border-color,box-shadow] duration-700 sm:size-24 sm:p-5 md:size-32 md:rounded-[28px] md:p-7 ${
          lit ? 'group-[.is-connected]:border-lime/70 group-[.is-connected]:shadow-[0_0_60px_-10px_rgb(198_255_77/0.45)]' : ''
        }`}
      >
        {children}
        {jack && <span aria-hidden className="absolute -right-[7px] top-1/2 h-5 w-[7px] -translate-y-1/2 rounded-r-[3px] bg-[#3a414c]" />}
      </div>
      <p className="mt-4 font-display text-sm font-semibold tracking-tight sm:text-lg md:text-2xl">{label}</p>
      <p className="mt-1 hidden text-sm text-mist sm:block">{sub}</p>
    </div>
    </div>
  )
}
