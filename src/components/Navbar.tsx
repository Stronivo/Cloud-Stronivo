import { useEffect, useRef, useState } from 'react'
import { NAV } from '../data/site'
import { Logo } from './Logo'
import { MagneticLink } from './Magnetic'

export function Navbar({ home = true }: { home?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string>('start')
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const prefix = home ? '' : '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // highlight the section currently in view
  useEffect(() => {
    if (!home) return
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [home])

  // mobile menu: lock scroll, close on Escape, keep focus inside
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // wait for the panel to become visible before moving focus into it
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('a')?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = [toggleRef.current!, ...panelRef.current.querySelectorAll<HTMLElement>('a')]
        const i = items.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey && i <= 0) {
          e.preventDefault()
          items[items.length - 1].focus()
        } else if (!e.shiftKey && i === items.length - 1) {
          e.preventDefault()
          items[0].focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const close = () => mq.matches && setOpen(false)
    mq.addEventListener('change', close)
    return () => mq.removeEventListener('change', close)
  }, [])

  return (
    <header className="intro-fade fixed inset-x-0 top-0 z-50" style={{ '--d': 650 } as React.CSSProperties}>
      <div
        className={`absolute inset-0 -z-10 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled && !open ? 'border-line/70 bg-ink/80 backdrop-blur-md' : 'border-transparent bg-transparent'
        }`}
      />
      <nav
        aria-label="Główna nawigacja"
        className={`container-x flex items-center justify-between transition-[height] duration-500 ${scrolled ? 'h-16 md:h-[4.5rem]' : 'h-20 md:h-24'}`}
      >
        <a href={`${prefix}#start`} className="relative z-10 text-2xl md:text-[1.7rem]" aria-label="Stronivo — strona główna">
          <Logo />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <li key={n.id}>
              <a
                href={`${prefix}${n.href}`}
                aria-current={home && active === n.id ? 'true' : undefined}
                className="group relative rounded-full px-4 py-2 text-[0.92rem] text-mist transition-colors hover:text-paper aria-[current]:text-paper"
              >
                {n.label}
                <span
                  aria-hidden
                  className="absolute inset-x-4 -bottom-0.5 h-px origin-left scale-x-0 bg-lime transition-transform duration-500 ease-out-expo group-hover:scale-x-100 group-aria-[current]:scale-x-100"
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <MagneticLink href={`${prefix}#kontakt`} className="!hidden !min-h-11 !px-6 !text-sm sm:!inline-flex">
            Rozpocznij projekt
          </MagneticLink>
          <button
            ref={toggleRef}
            type="button"
            className="relative z-10 inline-flex size-12 items-center justify-center rounded-full border border-line lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden className="relative block h-3 w-5">
              <span className={`absolute left-0 h-[1.5px] w-5 bg-paper transition-all duration-500 ease-out-expo ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 h-[1.5px] bg-paper transition-all duration-500 ease-out-expo ${open ? 'top-1.5 w-5 -rotate-45' : 'top-3 w-3'}`} />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        ref={panelRef}
        aria-hidden={!open}
        className={`fixed inset-0 top-0 -z-10 flex flex-col bg-ink px-5 pb-8 pt-28 transition-[opacity,visibility] duration-500 lg:hidden ${
          open ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <svg aria-hidden viewBox="0 0 400 800" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          <path
            d="M420 120 C 260 140, 300 330, 180 360 S 40 520, 120 640 S 300 760, 260 820"
            fill="none"
            stroke="#c6ff4d"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            pathLength={1}
            strokeDasharray="1"
            className={`transition-[stroke-dashoffset] duration-[1400ms] ease-out-expo ${open ? '[stroke-dashoffset:0]' : '[stroke-dashoffset:1]'}`}
          />
        </svg>
        <ul className="relative flex flex-1 flex-col justify-center gap-1">
          {NAV.map((n, i) => (
            <li key={n.id} className="overflow-hidden">
              <a
                href={`${prefix}${n.href}`}
                onClick={() => setOpen(false)}
                className={`flex items-baseline gap-4 py-2 font-display text-[clamp(2.4rem,11vw,3.5rem)] font-semibold leading-none tracking-[-0.04em] transition-[transform,color] duration-700 ease-out-expo hover:text-lime ${
                  open ? 'translate-y-0' : 'translate-y-full'
                }`}
                style={{ transitionDelay: open ? `${120 + i * 60}ms` : '0ms' }}
              >
                <span className="font-sans text-xs font-medium tracking-normal text-mist">0{i + 1}</span>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="relative flex flex-col gap-4 border-t border-line pt-6">
          <a href={`${prefix}#kontakt`} onClick={() => setOpen(false)} className="inline-flex min-h-14 items-center justify-center rounded-full bg-lime font-display font-medium text-ink">
            Rozpocznij projekt
          </a>
          <a href="mailto:kontakt@stronivo.com" className="text-center text-mist">
            kontakt@stronivo.com
          </a>
        </div>
      </div>
    </header>
  )
}
