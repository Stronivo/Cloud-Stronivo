import { useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useFinePointer, useReducedMotion } from '../hooks/useMedia'

type Variant = 'primary' | 'ghost' | 'dark'

const base =
  'group/btn relative inline-flex items-center justify-center gap-3 rounded-full font-display font-medium tracking-tight ' +
  'transition-[background-color,color,border-color,box-shadow] duration-300 will-change-transform select-none ' +
  'min-h-12 px-7 text-[0.95rem] sm:min-h-14 sm:px-8 sm:text-base'

const variants: Record<Variant, string> = {
  primary: 'bg-lime text-ink hover:bg-paper hover:shadow-[0_0_0_6px_rgb(198_255_77/0.14)]',
  ghost: 'border border-line text-paper hover:border-paper/60 hover:bg-paper/5',
  dark: 'bg-ink text-paper hover:bg-surface',
}

function useMagnet(strength = 0.32) {
  const ref = useRef<HTMLElement | null>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const active = fine && !reduced

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    ref.current.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`
    if (innerRef.current) innerRef.current.style.transform = `translate3d(${x * strength * 0.35}px, ${y * strength * 0.35}px, 0)`
  }
  const onPointerLeave = () => {
    if (!ref.current) return
    ref.current.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)'
    ref.current.style.transform = ''
    if (innerRef.current) {
      innerRef.current.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)'
      innerRef.current.style.transform = ''
    }
  }
  const onPointerEnter = () => {
    if (ref.current) ref.current.style.transition = 'transform .15s linear'
    if (innerRef.current) innerRef.current.style.transition = 'transform .15s linear'
  }
  return { ref, innerRef, handlers: { onPointerMove, onPointerLeave, onPointerEnter } }
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex size-5 overflow-hidden ${className}`}>
      <svg viewBox="0 0 20 20" className="absolute inset-0 size-5 transition-transform duration-500 ease-out-expo group-hover/btn:translate-x-6">
        <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 20 20" className="absolute inset-0 size-5 -translate-x-6 transition-transform duration-500 ease-out-expo group-hover/btn:translate-x-0">
        <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; children: ReactNode; arrow?: boolean }

export function MagneticLink({ variant = 'primary', className = '', children, arrow = true, ...rest }: LinkProps) {
  const { ref, innerRef, handlers } = useMagnet()
  return (
    <a ref={ref as React.Ref<HTMLAnchorElement>} data-cursor="link" className={`${base} ${variants[variant]} ${className}`} {...handlers} {...rest}>
      <span ref={innerRef} className="inline-flex items-center gap-3">
        {children}
        {arrow && <Arrow />}
      </span>
    </a>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode; arrow?: boolean }

export function MagneticButton({ variant = 'primary', className = '', children, arrow = true, ...rest }: ButtonProps) {
  const { ref, innerRef, handlers } = useMagnet(0.22)
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} data-cursor="link" className={`${base} ${variants[variant]} ${className}`} {...handlers} {...rest}>
      <span ref={innerRef} className="inline-flex items-center gap-3">
        {children}
        {arrow && <Arrow />}
      </span>
    </button>
  )
}
