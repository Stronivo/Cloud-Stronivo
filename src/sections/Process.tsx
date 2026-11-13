import { useCallback, useEffect, useRef } from 'react'
import { STEPS } from '../data/site'
import { Reveal, SplitText } from '../components/Reveal'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { useReducedMotion } from '../hooks/useMedia'

export function Process() {
  const list = useRef<HTMLOListElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const head = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  // Geometry is cached when the list resizes (ResizeObserver runs after layout), so the
  // scroll callback below only writes and never forces a reflow.
  const geo = useRef<{ h: number; steps: { el: HTMLElement; at: number }[] }>({ h: 1, steps: [] })
  const lastP = useRef(0)
  const applyRef = useRef<(p: number) => void>(() => {})
  useEffect(() => {
    const el = list.current
    if (!el) return
    const measure = () => {
      const h = el.offsetHeight || 1
      geo.current = {
        h,
        steps: [...el.querySelectorAll<HTMLElement>('[data-step]')].map((s) => ({ el: s, at: (s.offsetTop + 28) / h })),
      }
      applyRef.current(lastP.current) // re-apply with fresh geometry
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onProgress = useCallback(
    (raw: number) => {
      const p = reduced ? 1 : raw
      lastP.current = raw
      const { h, steps } = geo.current
      if (fill.current) fill.current.style.transform = `scaleY(${p})`
      if (head.current) head.current.style.transform = `translate3d(0, ${(p * h).toFixed(1)}px, 0)`
      for (const s of steps) s.el.classList.toggle('is-lit', p >= s.at)
    },
    [reduced],
  )
  useEffect(() => {
    applyRef.current = onProgress
  }, [onProgress])
  useScrollProgress(list, onProgress, { start: 0.7, end: 0.6 })

  return (
    <section aria-labelledby="process-title" className="relative border-t border-line/60 py-28 md:py-44">
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <Reveal as="p" className="eyebrow mb-6">
              <span className="text-lime">04</span> — Proces współpracy
            </Reveal>
            <SplitText
              id="process-title"
              text="Od pierwszej rozmowy do ostatniego kliknięcia."
              className="text-[clamp(2.4rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.045em]"
            />
            <Reveal className="mt-8 max-w-sm text-mist" delay={200}>
              <p>Cztery jasne etapy. Zawsze wiesz, na jakim jesteśmy etapie i co wydarzy się dalej.</p>
            </Reveal>
          </div>
        </div>

        <ol ref={list} className="relative lg:col-span-6 lg:col-start-7">
          {/* the line: grey track + lime fill + travelling plug head */}
          <span aria-hidden className="absolute bottom-0 left-[11px] top-0 w-[3px] rounded-full bg-line md:left-[15px]" />
          <span
            ref={fill}
            aria-hidden
            className="absolute bottom-0 left-[11px] top-0 w-[3px] origin-top scale-y-0 rounded-full bg-lime shadow-[0_0_12px_rgb(198_255_77/0.6)] md:left-[15px]"
          />
          <span ref={head} aria-hidden className="absolute -top-3 left-[3px] md:left-[7px]">
            <svg viewBox="0 0 20 30" className="h-[30px] w-5">
              <rect x="3" y="0" width="14" height="18" rx="4" fill="#3a414c" />
              <rect x="6" y="18" width="8" height="8" rx="1.5" fill="#c6ff4d" />
            </svg>
          </span>

          {STEPS.map((s) => (
            <li key={s.no} data-step className="group/step relative pb-16 pl-12 last:pb-0 md:pb-24 md:pl-20">
              <span
                aria-hidden
                className="absolute left-0 top-2 flex size-[25px] items-center justify-center rounded-full border-2 border-line bg-ink transition-[border-color,box-shadow] duration-500 group-[.is-lit]/step:border-lime group-[.is-lit]/step:shadow-[0_0_0_6px_rgb(198_255_77/0.12)] md:size-[33px]"
              >
                <span className="size-2 rounded-full bg-line transition-colors duration-500 group-[.is-lit]/step:bg-lime" />
              </span>
              <p className="font-display text-sm tabular-nums text-mist transition-colors duration-500 group-[.is-lit]/step:text-lime">
                {s.no}.
              </p>
              <h3 className="mt-2 text-[clamp(1.8rem,3.4vw,3rem)] font-semibold leading-none tracking-[-0.035em] text-paper/40 transition-colors duration-700 group-[.is-lit]/step:text-paper">
                {s.title}
              </h3>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-mist">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
