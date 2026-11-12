import { useEffect, useRef } from 'react'
import { useFinePointer, useReducedMotion } from '../hooks/useMedia'

/**
 * A two-part cursor: a precise lime dot plus a lagging ring that reacts to
 * interactive elements. Elements can opt into a labelled state with
 * data-cursor="view" data-cursor-label="Zobacz".
 * Only mounted for fine pointers without reduced-motion preference.
 */
export function Cursor() {
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const enabled = fine && !reduced
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-cursor')
    let x = -100, y = -100, rx = -100, ry = -100
    let raf = 0
    let mode = ''
    let visible = false

    const apply = (m: string, text = '') => {
      if (m === mode) return
      mode = m
      const r = ring.current!
      r.dataset.mode = m
      if (label.current) label.current.textContent = text
    }

    const tick = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      dot.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`
      ring.current!.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.1 ? requestAnimationFrame(tick) : 0
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX
      y = e.clientY
      if (!visible) {
        visible = true
        rx = x
        ry = y
        dot.current!.style.opacity = '1'
        ring.current!.style.opacity = '1'
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onOver = (e: PointerEvent) => {
      const t = (e.target as Element).closest<HTMLElement>('[data-cursor], a, button, input, textarea, select, label')
      if (!t) return apply('')
      const kind = t.dataset.cursor
      if (kind === 'view') return apply('view', t.dataset.cursorLabel ?? 'Zobacz')
      if (t.matches('input, textarea, select')) return apply('text')
      apply('link')
    }
    const onLeave = () => {
      visible = false
      dot.current!.style.opacity = '0'
      ring.current!.style.opacity = '0'
    }
    const onDown = () => ring.current!.classList.add('scale-75')
    const onUp = () => ring.current!.classList.remove('scale-75')

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      root.classList.remove('has-cursor')
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <div ref={dot} className="absolute left-0 top-0 opacity-0 transition-opacity duration-300">
        <div className="-ml-[3px] -mt-[3px] size-1.5 rounded-full bg-lime" />
      </div>
      <div ref={ring} data-mode="" className="cursor-ring group/c absolute left-0 top-0 opacity-0 transition-opacity duration-300">
        <div className="cursor-ring-inner flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-paper/40 font-display text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ink">
          <span ref={label} className="cursor-label opacity-0" />
        </div>
      </div>
    </div>
  )
}
