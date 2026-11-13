import { useEffect, useRef, useState } from 'react'
import { SECTIONS } from '../data/site'
import { useI18n } from '../i18n/I18n'
import { useShop } from '../lib/shop'
import { Logo } from './Logo'
import { MagneticLink } from './Magnetic'

export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div role="group" aria-label={t.meta.langLabel} className={`relative rounded-full bg-navy/[0.06] p-1 font-display text-xs font-bold ${className}`}>
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-500 ease-out-expo"
        style={{ transform: lang === 'en' ? 'translateX(100%)' : 'none' }}
      />
      {(['pl', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`relative z-10 min-h-9 min-w-10 rounded-full px-2.5 uppercase transition-colors ${lang === l ? 'text-navy' : 'text-muted hover:text-navy'}`}
        >
          {l}
          <span className="sr-only">{l === 'pl' ? ' — polski' : ' — English'}</span>
        </button>
      ))}
    </div>
  )
}

export function CartButton({ className = '' }: { className?: string }) {
  const { cart, setCartOpen } = useShop()
  const { t } = useI18n()
  const [bump, setBump] = useState(false)
  const prev = useRef(cart.length)
  useEffect(() => {
    if (cart.length > prev.current) {
      setBump(true)
      const id = window.setTimeout(() => setBump(false), 600)
      prev.current = cart.length
      return () => window.clearTimeout(id)
    }
    prev.current = cart.length
  }, [cart.length])
  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      aria-label={t.nav.cartCount(cart.length)}
      className={`relative inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-navy/15 text-navy transition-colors hover:border-navy ${className}`}
    >
      <svg viewBox="0 0 24 24" className={`size-5 transition-transform duration-500 ease-out-expo ${bump ? '-translate-y-1 rotate-[-8deg]' : ''}`} aria-hidden>
        <path d="M5 8h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      {cart.length > 0 && (
        <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-blue px-1 font-display text-[0.68rem] leading-5 font-bold text-white">
          {cart.length}
        </span>
      )}
    </button>
  )
}

export function Navbar({ home = true }: { home?: boolean }) {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('start')
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const prefix = home ? '' : '/'

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      // hide on fast downward scroll deep in the page, show on any upward scroll
      if (Math.abs(y - last) > 6) setHidden(y > last && y > 900)
      last = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!home) return
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [home])

  useEffect(() => {
    if (!open) return
    document.body.classList.add('noscroll')
    const id = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('a')?.focus(), 80)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = [toggleRef.current!, ...panelRef.current.querySelectorAll<HTMLElement>('a,button')]
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
      document.body.classList.remove('noscroll')
      window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-700 ease-out-expo ${hidden && !open ? '-translate-y-full' : ''}`}
    >
      <div className="container-x pt-3 md:pt-4">
        <nav
          aria-label={t.nav.main}
          className={`relative flex items-center justify-between gap-3 rounded-full border transition-[background-color,border-color,box-shadow,padding] duration-500 ease-out-expo ${
            scrolled || open
              ? 'border-navy/10 bg-ivory/85 py-2 pr-2 pl-5 shadow-[0_10px_30px_-18px_rgb(23_36_58/0.35)] backdrop-blur-xl'
              : 'border-transparent bg-transparent py-3 pr-0 pl-0'
          }`}
        >
          <a href={`${prefix}#start`} className="relative z-10 shrink-0 text-lg md:text-xl" aria-label="EnglishPocket — strona główna">
            <Logo />
          </a>

          <ul className="hidden items-center gap-0.5 xl:flex">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`${prefix}#${s.id}`}
                  aria-current={home && active === s.id ? 'true' : undefined}
                  className="relative rounded-full px-3.5 py-2 text-[0.9rem] font-medium text-muted transition-colors hover:text-navy aria-[current]:text-navy"
                >
                  {t.nav[s.key]}
                  {home && active === s.id && <span aria-hidden className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-blue" />}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <LangSwitch className="hidden md:inline-flex" />
            <CartButton />
            <MagneticLink href={`${prefix}#materialy`} className="!hidden !min-h-11 !px-5 !text-sm md:!inline-flex">
              {t.nav.cta}
            </MagneticLink>
            <button
              ref={toggleRef}
              type="button"
              className="relative z-10 inline-flex size-11 items-center justify-center rounded-full bg-navy text-ivory xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.nav.close : t.nav.open}
              onClick={() => setOpen((o) => !o)}
            >
              <span aria-hidden className="relative block h-3 w-5">
                <span className={`absolute left-0 h-[2px] w-5 rounded bg-current transition-all duration-500 ease-out-expo ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
                <span className={`absolute right-0 h-[2px] rounded bg-current transition-all duration-500 ease-out-expo ${open ? 'top-1.5 w-5 -rotate-45' : 'top-3 w-3'}`} />
              </span>
            </button>
          </div>
        </nav>
      </div>

      <div
        id="mobile-menu"
        ref={panelRef}
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-0 -z-10 flex flex-col overflow-y-auto bg-ivory px-5 pt-28 pb-8 transition-[clip-path] duration-700 ease-in-out-quart xl:hidden ${
          open ? '[clip-path:circle(150%_at_calc(100%-2.5rem)_2.5rem)]' : '[clip-path:circle(0%_at_calc(100%-2.5rem)_2.5rem)]'
        }`}
      >
        <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
        <ul className="relative flex flex-col">
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="overflow-hidden border-b border-line">
              <a
                href={`${prefix}#${s.id}`}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-4 py-4 font-display text-[clamp(2rem,9vw,3rem)] font-extrabold tracking-[-0.04em] text-navy transition-[transform,opacity] duration-700 ease-out-expo"
                style={{ transform: open ? 'none' : 'translateY(100%)', opacity: open ? 1 : 0, transitionDelay: open ? `${200 + i * 60}ms` : '0ms' }}
              >
                <span className="font-sans text-xs font-semibold text-blue">0{i + 1}</span>
                {t.nav[s.key]}
              </a>
            </li>
          ))}
        </ul>
        <div className="relative mt-auto flex flex-wrap items-center justify-between gap-4 pt-10">
          <LangSwitch className="inline-flex" />
          <MagneticLink href={`${prefix}#materialy`} onClick={() => setOpen(false)}>
            {t.nav.cta}
          </MagneticLink>
        </div>
      </div>
    </header>
  )
}
