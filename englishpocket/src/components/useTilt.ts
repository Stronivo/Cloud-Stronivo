import { useRef } from 'react'

/** Pointer tilt for 3D objects: writes CSS variables, so it costs no React renders. */
export function useTilt<T extends HTMLElement>(max = 14) {
  const ref = useRef<T>(null)
  const raf = useRef(0)
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return
    const el = ref.current
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--ry', `${x * max * 2}deg`)
      el.style.setProperty('--rx', `${-y * max}deg`)
      el.style.setProperty('--sx', `${-x * 30}px`)
      el.style.setProperty('--sheen', `${(1 - (x + 0.5)) * 100}%`)
      el.dataset.hover = ''
    })
  }
  const onPointerLeave = () => {
    cancelAnimationFrame(raf.current)
    const el = ref.current
    if (!el) return
    el.style.removeProperty('--ry')
    el.style.removeProperty('--rx')
    el.style.removeProperty('--sx')
    el.style.removeProperty('--sheen')
    delete el.dataset.hover
  }
  return { ref, handlers: { onPointerMove, onPointerLeave } }
}
