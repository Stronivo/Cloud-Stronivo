import { useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useFinePointer, useReducedMotion } from '../hooks/useMedia'

type Variant = 'primary' | 'ghost' | 'dark' | 'light'

const base =
  'group/btn relative inline-flex items-center justify-center gap-3 rounded-full font-display font-bold tracking-tight ' +
  'transition-[background-color,color,border-color,box-shadow] duration-300 will-change-transform select-none ' +
  'min-h-12 px-6 text-[0.95rem] sm:min-h-14 sm:px-8 sm:text-base disabled:cursor-not-allowed disabled:opacity-55'

const variants: Record<Variant, string> = {
  primary: 'bg-blue text-white hover:bg-blue-ink shadow-[0_10px_30px_-10px_rgb(73_120_255/0.7)] hover:shadow-[0_14px_36px_-10px_rgb(73_120_255/0.85)]',
  ghost: 'border-[1.5px] border-navy/20 text-navy hover:border-navy hover:bg-navy hover:text-ivory',
  dark: 'bg-navy text-ivory hover:bg-navy-2',
  light: 'bg-ivory text-navy hover:bg-white',
}

function useMagnet(strength = 0.3) {
  const ref = useRef<HTMLElement | null>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const active = fine && !reduced

  const set = (el: HTMLElement | null, t: string, tr: string) => {
    if (!el) return
    el.style.transition = tr
    el.style.transform = t
  }
  return {
    ref,
    innerRef,
    handlers: {
      onPointerMove: (e: React.PointerEvent) => {
        if (!active || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        const x = e.clientX - (r.left + r.width / 2)
        const y = e.clientY - (r.top + r.height / 2)
        set(ref.current, `translate3d(${x * strength}px, ${y * strength}px, 0)`, 'transform .15s linear')
        set(innerRef.current, `translate3d(${x * strength * 0.4}px, ${y * strength * 0.4}px, 0)`, 'transform .15s linear')
      },
      onPointerLeave: () => {
        set(ref.current, '', 'transform .7s cubic-bezier(.16,1,.3,1)')
        set(innerRef.current, '', 'transform .7s cubic-bezier(.16,1,.3,1)')
      },
    },
  }
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex size-5 overflow-hidden ${className}`}>
      <svg viewBox="0 0 20 20" className="absolute inset-0 size-5 transition-transform duration-500 ease-out-expo group-hover/btn:translate-x-6">
        <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 20 20" className="absolute inset-0 size-5 -translate-x-6 transition-transform duration-500 ease-out-expo group-hover/btn:translate-x-0">
        <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

type Common = { variant?: Variant; children: ReactNode; arrow?: boolean }

export function MagneticLink({ variant = 'primary', className = '', children, arrow = true, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & Common) {
  const { ref, innerRef, handlers } = useMagnet()
  return (
    <a ref={ref as React.Ref<HTMLAnchorElement>} className={`${base} ${variants[variant]} ${className}`} {...handlers} {...rest}>
      <span ref={innerRef} className="inline-flex items-center gap-3">
        {children}
        {arrow && <Arrow />}
      </span>
    </a>
  )
}

export function MagneticButton({ variant = 'primary', className = '', children, arrow = true, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & Common) {
  const { ref, innerRef, handlers } = useMagnet(0.2)
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} className={`${base} ${variants[variant]} ${className}`} {...handlers} {...rest}>
      <span ref={innerRef} className="inline-flex items-center gap-3">
        {children}
        {arrow && <Arrow />}
      </span>
    </button>
  )
}
