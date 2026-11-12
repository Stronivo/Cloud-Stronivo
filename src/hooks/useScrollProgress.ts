import { useEffect, type RefObject } from 'react'

/**
 * Calls `onProgress` with 0..1 describing how far the element has travelled
 * through the viewport. Runs in rAF, only while the element is near the viewport,
 * and never triggers React renders by itself.
 *
 * start/end are viewport fractions: progress = 0 when the element top hits
 * `start * vh`, and 1 when the element bottom hits `end * vh`.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  { start = 1, end = 0 }: { start?: number; end?: number } = {},
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let visible = false

    const measure = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const from = start * vh
      const to = end * vh
      const total = r.height + from - to
      const p = total <= 0 ? 1 : (from - r.top) / total
      onProgress(Math.min(1, Math.max(0, p)))
    }
    const onScroll = () => {
      if (visible && !raf) raf = requestAnimationFrame(measure)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) onScroll()
      },
      { rootMargin: '25% 0px 25% 0px' },
    )
    io.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    measure()
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [ref, onProgress, start, end])
}
