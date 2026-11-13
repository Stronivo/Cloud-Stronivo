import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { CHAT } from './config'

/**
 * Floating entry point for Stroniq. Lives in the main bundle and is tiny; the widget itself
 * (and everything it needs) is a separate chunk downloaded on first interaction.
 * It appears only after the hero intro has finished, so it never competes with the first view.
 */
const loadWidget = () => import('./ChatWidget')
const ChatWidget = lazy(loadWidget)

export function ChatLauncher() {
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false) // widget stays mounted after first open (keeps state)
  const [avoid, setAvoid] = useState(false)
  const button = useRef<HTMLButtonElement>(null)

  // appear after the intro (or immediately on pages without one)
  useEffect(() => {
    const root = document.documentElement
    const check = () => root.classList.contains('intro-done') && setReady(true)
    check()
    const mo = new MutationObserver(check)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    const t = window.setTimeout(() => setReady(true), 4500)
    return () => {
      mo.disconnect()
      clearTimeout(t)
    }
  }, [])

  // step aside when an important control ([data-chat-avoid]) reaches the bottom of the screen
  useEffect(() => {
    if (!ready) return
    const targets = document.querySelectorAll('[data-chat-avoid]')
    if (!targets.length) return
    const visible = new Set<Element>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target)
          else visible.delete(e.target)
        }
        setAvoid(visible.size > 0)
      },
      { rootMargin: '-82% 0px 0px 0px' }, // bottom ~18% of the viewport
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [ready])

  const toggle = useCallback(() => {
    setMounted(true)
    setOpen((o) => !o)
  }, [])
  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => button.current?.focus())
  }, [])

  if (!ready) return null

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        onPointerEnter={loadWidget}
        onFocus={loadWidget}
        onTouchStart={loadWidget}
        aria-expanded={open}
        aria-controls="stroniq-panel"
        aria-label={open ? `Zamknij czat z asystentem AI ${CHAT.name}` : `Otwórz czat z asystentem AI ${CHAT.name}`}
        className={`group/l fixed bottom-4 right-4 z-40 flex items-center gap-3 transition-[opacity,transform] duration-300 sm:bottom-6 sm:right-6 ${
          avoid && !open ? 'pointer-events-none translate-y-3 opacity-0' : ''
        } ${open ? 'max-sm:hidden' : ''}`}
      >
        <span
          aria-hidden
          className="pointer-events-none hidden translate-x-2 rounded-full border border-line bg-ink/90 px-4 py-2 font-display text-sm text-paper opacity-0 shadow-lg backdrop-blur transition-[opacity,transform] duration-300 group-hover/l:translate-x-0 group-hover/l:opacity-100 sm:block"
        >
          {open ? 'Zamknij czat' : `Zapytaj ${CHAT.name}`}
        </span>
        <span className="relative">
        <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-full border border-lime/40 bg-black shadow-[0_10px_30px_-10px_rgb(0_0_0/0.8),0_0_0_4px_rgb(198_255_77/0.08)] transition-transform duration-300 ease-out-expo group-hover/l:scale-105 group-active/l:scale-95">
          {open ? (
            <svg aria-hidden viewBox="0 0 24 24" className="size-6 text-paper">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <img src="/stroniq/stroniq-128.webp" alt="" width={56} height={56} decoding="async" className="size-full object-cover" />
          )}
        </span>
        {!open && <span aria-hidden className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-ink bg-lime" />}
        </span>
      </button>
      {mounted && (
        <Suspense fallback={null}>
          <ChatWidget open={open} onClose={close} />
        </Suspense>
      )}
    </>
  )
}
