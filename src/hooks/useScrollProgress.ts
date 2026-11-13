import { useEffect, type RefObject } from 'react'

/**
 * Scroll-linked progress for several sections, batched into ONE requestAnimationFrame:
 * every subscriber's layout read happens first, then every write (callback).
 * Separate rAF loops would interleave read → write → read and force a synchronous
 * reflow per section per frame.
 *
 * `onProgress` gets 0..1: 0 when the element top hits `start * vh`, 1 when its bottom
 * hits `end * vh`. Callbacks must only WRITE to the DOM (cache any geometry they need,
 * e.g. in a ResizeObserver callback, which runs after layout).
 */
type Sub = { el: HTMLElement; start: number; end: number; cb: (p: number) => void; visible: boolean; last: number }

const subs = new Set<Sub>()
let raf = 0

function flush() {
  raf = 0
  const vh = window.innerHeight
  // phase 1: reads
  const reads: [Sub, number][] = []
  for (const s of subs) {
    if (!s.visible) continue
    const r = s.el.getBoundingClientRect()
    const from = s.start * vh
    const total = r.height + from - s.end * vh
    const p = total <= 0 ? 1 : (from - r.top) / total
    reads.push([s, Math.min(1, Math.max(0, p))])
  }
  // phase 2: writes
  for (const [s, p] of reads) {
    if (p === s.last) continue
    s.last = p
    s.cb(p)
  }
}

const schedule = () => {
  if (!raf) raf = requestAnimationFrame(flush)
}

let listening = false
function listen() {
  if (listening) return
  listening = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
}

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  { start = 1, end = 0 }: { start?: number; end?: number } = {},
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const sub: Sub = { el, start, end, cb: onProgress, visible: false, last: -1 }
    subs.add(sub)
    listen()
    const io = new IntersectionObserver(
      ([e]) => {
        sub.visible = e.isIntersecting
        if (sub.visible) schedule()
      },
      { rootMargin: '25% 0px 25% 0px' },
    )
    io.observe(el)
    // initial state, computed in the next frame (never synchronously after React's DOM writes)
    sub.visible = true
    schedule()
    return () => {
      io.disconnect()
      subs.delete(sub)
    }
  }, [ref, onProgress, start, end])
}
