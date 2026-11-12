import { createElement, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { useInView } from '../hooks/useInView'

type RevealProps = {
  as?: ElementType
  className?: string
  delay?: number
  children: ReactNode
  id?: string
}

/** Fades + lifts its children in once they scroll into view. */
export function Reveal({ as = 'div', className = '', delay = 0, children, id }: RevealProps) {
  const [ref, inView] = useInView<HTMLElement>()
  return createElement(
    as,
    { ref, id, className: `reveal ${inView ? 'is-in' : ''} ${className}`, style: { '--d': delay } as CSSProperties },
    children,
  )
}

type SplitProps = {
  as?: ElementType
  text: string | string[]
  className?: string
  lineClassName?: string
  delay?: number
  id?: string
}

/**
 * Masked word-by-word reveal. Pass an array to force line breaks.
 * Words stay real text nodes, so the heading reads naturally for assistive tech.
 */
export function SplitText({ as = 'h2', text, className = '', lineClassName = '', delay = 0, id }: SplitProps) {
  const [ref, inView] = useInView<HTMLElement>()
  const lines = (Array.isArray(text) ? text : [text]).map((l) => l.split(' '))
  const offsets = lines.map((_, li) => lines.slice(0, li).reduce((n, l) => n + l.length, 0))
  return createElement(
    as,
    { ref, id, className: `${inView ? 'is-in' : ''} ${className}`, style: { '--d': delay } as CSSProperties },
    lines.map((line, li) => (
      <span key={li} className={`block ${lineClassName}`}>
        {line.map((w, wi, arr) => (
          <span key={wi}>
            <span className="split-word">
              <span style={{ '--i': offsets[li] + wi } as CSSProperties}>{w}</span>
            </span>
            {wi < arr.length - 1 ? ' ' : ''}
          </span>
        ))}
        {li < lines.length - 1 ? ' ' : ''}
      </span>
    )),
  )
}
