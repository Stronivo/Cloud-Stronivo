import { useState } from 'react'
import { SERVICES } from '../data/site'
import { Reveal, SplitText } from '../components/Reveal'

/**
 * A large editorial index on the left; on desktop a sticky "monitor" on the right
 * is fed by a cable that follows whichever service is active.
 * All descriptions are always visible — the interaction only adds illustration.
 */
export function Services() {
  const [active, setActive] = useState(0)

  return (
    <section id="uslugi" aria-labelledby="services-title" className="relative border-t border-line/60 py-28 md:py-44">
      <div className="container-x">
        <div className="max-w-5xl">
          <Reveal as="p" className="eyebrow mb-6">
            <span className="text-lime">02</span> — Usługi
          </Reveal>
          <SplitText
            id="services-title"
            text={['Wszystko, czego potrzebuje', 'Twoja firma w sieci.']}
            className="text-[clamp(2.5rem,6.6vw,6.25rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
          />
          <Reveal className="mt-8 max-w-2xl md:mt-10" delay={150}>
            <p className="text-lg leading-relaxed text-mist">
              Tworzymy strony internetowe dla firm, które chcą dobrze wyglądać w sieci i być łatwe do znalezienia: od
              wizytówek małych firm usługowych, przez{' '}
              <a href="#realizacje" className="text-paper underline decoration-line underline-offset-4 transition-colors hover:text-lime hover:decoration-lime">
                strony internetowe dla restauracji
              </a>{' '}
              i kawiarni z menu, zdjęciami i danymi kontaktowymi, po landing page nastawione na zapytania od klientów.
              Każdy projekt dopasowujemy do charakteru biznesu i przygotowujemy z myślą o telefonach oraz wyszukiwarkach.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-12 md:mt-24 lg:grid-cols-12 lg:gap-0">
          <ol className="relative lg:col-span-7">
            {SERVICES.map((s, i) => {
              const on = active === i
              return (
                <li
                  key={s.no}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className="group/s relative border-t border-line last:border-b"
                >
                  <Reveal delay={i * 80}>
                    <article className="grid grid-cols-[auto_1fr] gap-x-5 py-8 md:gap-x-10 md:py-11 lg:pr-16">
                      <span
                        className={`pt-2 font-display text-sm tabular-nums transition-colors duration-500 md:pt-4 ${on ? 'text-lime' : 'text-mist'}`}
                      >
                        {s.no}
                      </span>
                      <div>
                        <h3
                          className={`text-[clamp(1.9rem,4.4vw,3.6rem)] font-semibold leading-[1] tracking-[-0.04em] transition-[color,transform] duration-700 ease-out-expo ${
                            on ? 'lg:translate-x-3' : 'lg:text-paper/55'
                          }`}
                        >
                          {s.title}
                        </h3>
                        <p className="mt-4 max-w-xl leading-relaxed text-mist md:text-lg">{s.body}</p>
                        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Zakres">
                          {s.tags.map((t) => (
                            <li key={t} className="rounded-full border border-line px-3 py-1 text-xs text-mist">
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  </Reveal>
                  {/* cable feed toward the monitor (desktop) */}
                  <span
                    aria-hidden
                    className={`absolute right-0 top-1/2 hidden h-[3px] origin-right -translate-y-1/2 rounded-full bg-lime transition-[width,opacity] duration-700 ease-out-expo lg:block ${
                      on ? 'w-16 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                </li>
              )
            })}
          </ol>

          <div aria-hidden className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-28 pl-0">
              <div className="relative">
                {/* socket on the monitor's edge */}
                <span className="absolute -left-2 top-1/2 z-10 h-12 w-4 -translate-y-1/2 rounded-md bg-[#3a414c]">
                  <span className="absolute inset-y-2 left-0 w-1.5 rounded-sm bg-[#050608]" />
                </span>
                <div className="overflow-hidden rounded-[22px] border border-line bg-ink-2 p-3 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.9)]">
                  <div className="flex items-center justify-between px-2 pb-3 pt-1 text-[0.7rem] text-mist">
                    <span className="font-display tracking-[0.2em]">MONITOR · {SERVICES[active].no}</span>
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-lime" /> live
                    </span>
                  </div>
                  <div className="relative aspect-[4/3.2] overflow-hidden rounded-[14px] bg-ink">
                    {[WebsiteScene, LandingScene, RefreshScene, SeoScene].map((Scene, i) => (
                      <div
                        key={i}
                        className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-out-expo ${
                          active === i ? 'opacity-100' : 'pointer-events-none scale-[0.97] opacity-0'
                        }`}
                      >
                        <Scene on={active === i} />
                      </div>
                    ))}
                  </div>
                  <p className="px-2 pb-1 pt-4 font-display text-lg font-medium tracking-tight">{SERVICES[active].short}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Mini scenes (decorative) ---------- */

const T = 'transition-all duration-700 ease-out-expo'

function WebsiteScene({ on }: { on: boolean }) {
  const blocks = [
    { x: 24, y: 22, w: 352, h: 18, d: 0 },
    { x: 24, y: 60, w: 210, h: 34, d: 120, lime: true },
    { x: 24, y: 104, w: 160, h: 10, d: 200 },
    { x: 24, y: 122, w: 120, h: 10, d: 240 },
    { x: 24, y: 146, w: 86, h: 22, d: 320, lime: true },
    { x: 252, y: 60, w: 124, h: 108, d: 260 },
    { x: 24, y: 192, w: 108, h: 90, d: 420 },
    { x: 146, y: 192, w: 108, h: 90, d: 480 },
    { x: 268, y: 192, w: 108, h: 90, d: 540 },
  ]
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full">
      {blocks.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx="6"
          fill={b.lime ? '#c6ff4d' : '#252a32'}
          className={T}
          style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(14px)', transitionDelay: `${b.d}ms` }}
        />
      ))}
    </svg>
  )
}

function LandingScene({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full">
      <rect x="110" y="20" width="180" height="300" rx="14" fill="#161a22" stroke="#2f353f" />
      <rect x="130" y="46" width="120" height="16" rx="4" fill="#f5f7f2" />
      <rect x="130" y="70" width="90" height="16" rx="4" fill="#f5f7f2" />
      <rect x="130" y="100" width="140" height="7" rx="3" fill="#2f353f" />
      <rect x="130" y="114" width="110" height="7" rx="3" fill="#2f353f" />
      <g className={T} style={{ transform: on ? 'scale(1)' : 'scale(.9)', transformOrigin: '200px 160px', transformBox: 'view-box' }}>
        <rect x="130" y="140" width="140" height="40" rx="20" fill="#c6ff4d" />
        <rect x="160" y="156" width="80" height="8" rx="4" fill="#10131a" />
      </g>
      <rect x="130" y="200" width="140" height="28" rx="6" fill="#252a32" />
      <rect x="130" y="236" width="140" height="28" rx="6" fill="#252a32" />
      <path
        d="M0 0 L0 22 L6 16 L11 27 L15 25 L10 14 L18 14 Z"
        fill="#f5f7f2"
        stroke="#10131a"
        strokeWidth="1.5"
        className="transition-transform duration-[1200ms] ease-out-expo"
        style={{ transform: on ? 'translate(236px,166px)' : 'translate(340px,280px)' }}
      />
      <circle
        cx="236"
        cy="166"
        r="16"
        fill="none"
        stroke="#c6ff4d"
        className="transition-opacity delay-700 duration-500"
        style={{ opacity: on ? 0.8 : 0 }}
      />
    </svg>
  )
}

function RefreshScene({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full">
      <defs>
        <clipPath id="refresh-clip">
          <rect
            x="0"
            y="0"
            height="320"
            className="transition-[width] delay-200 duration-[1400ms] ease-in-out-quart"
            style={{ width: on ? 260 : 0 }}
          />
        </clipPath>
      </defs>
      {/* before: dated layout */}
      <g>
        <rect x="24" y="22" width="352" height="40" fill="#2b2f37" />
        <text x="36" y="48" fill="#6b727c" fontFamily="Georgia, serif" fontSize="16">Moja Firma</text>
        <rect x="24" y="74" width="230" height="110" fill="#2b2f37" />
        <rect x="266" y="74" width="110" height="234" fill="#22262d" />
        {[198, 214, 230, 246, 262, 278].map((y) => (
          <rect key={y} x="24" y={y} width="230" height="6" fill="#2b2f37" />
        ))}
      </g>
      {/* after: modern */}
      <g clipPath="url(#refresh-clip)">
        <rect x="0" y="0" width="400" height="320" fill="#10131a" />
        <rect x="24" y="24" width="60" height="10" rx="5" fill="#f5f7f2" />
        <rect x="306" y="20" width="70" height="18" rx="9" fill="#c6ff4d" />
        <rect x="24" y="72" width="250" height="30" rx="6" fill="#f5f7f2" />
        <rect x="24" y="110" width="190" height="30" rx="6" fill="#f5f7f2" />
        <rect x="24" y="156" width="150" height="8" rx="4" fill="#2f353f" />
        <rect x="24" y="200" width="168" height="96" rx="12" fill="#252a32" />
        <rect x="208" y="200" width="168" height="96" rx="12" fill="#252a32" />
      </g>
      <g className="transition-transform delay-200 duration-[1400ms] ease-in-out-quart" style={{ transform: `translateX(${on ? 260 : 0}px)` }}>
        <rect x="-1" y="0" width="2" height="320" fill="#c6ff4d" />
        <circle cx="0" cy="160" r="14" fill="#c6ff4d" />
        <path d="M-5 155 l-4 5 4 5 M5 155 l4 5 -4 5" stroke="#10131a" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function SeoScene({ on }: { on: boolean }) {
  const arc = 'M90 220 A110 110 0 0 1 310 220'
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full">
      <path d={arc} fill="none" stroke="#252a32" strokeWidth="18" strokeLinecap="round" />
      <path
        d={arc}
        fill="none"
        stroke="#c6ff4d"
        strokeWidth="18"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        className="transition-[stroke-dashoffset] delay-150 duration-[1400ms] ease-out-expo"
        style={{ strokeDashoffset: on ? 0.08 : 1 }}
      />
      <text x="200" y="200" textAnchor="middle" fill="#f5f7f2" fontSize="26" fontWeight="600" fontFamily="'Space Grotesk Variable', sans-serif">
        szybko
      </text>
      <text x="200" y="224" textAnchor="middle" fill="#a4abb5" fontSize="11" letterSpacing="2" fontFamily="'Space Grotesk Variable', sans-serif">
        LCP · INP · CLS
      </text>
      <g className={T} style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(10px)', transitionDelay: '500ms' }}>
        <rect x="40" y="250" width="320" height="56" rx="10" fill="#161a22" stroke="#2f353f" />
        <text x="56" y="272" fill="#c6ff4d" fontSize="13" fontFamily="'Inter Variable', sans-serif">Twoja firma — strona główna</text>
        <text x="56" y="292" fill="#a4abb5" fontSize="10" fontFamily="'Inter Variable', sans-serif">twojafirma.pl › oferta</text>
      </g>
    </svg>
  )
}
