import { useEffect, useRef, useState } from 'react'

/** Flips to true once the element enters the viewport (one-shot). */
export function useInView<T extends Element>(options: IntersectionObserverInit = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  const { rootMargin = '0px 0px -12% 0px', threshold = 0.15 } = options

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView, rootMargin, threshold])

  return [ref, inView] as const
}
