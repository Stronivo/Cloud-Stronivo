import type { CSSProperties } from 'react'

export type WordCardProps = {
  en: string
  pl: string
  tag?: string
  tone?: 'blue' | 'lavender' | 'yellow' | 'navy' | 'ivory'
  className?: string
  style?: CSSProperties
  showPl?: boolean
}

const strip: Record<NonNullable<WordCardProps['tone']>, string> = {
  blue: '#4978FF',
  lavender: '#B9ADFF',
  yellow: '#FFD978',
  navy: '#17243A',
  ivory: '#E5DFD1',
}

/** A small paper vocabulary flashcard — the core visual unit of the brand. */
export function WordCard({ en, pl, tag = 'word', tone = 'blue', className = '', style, showPl = true }: WordCardProps) {
  return (
    <div
      className={`ruled shadow-card relative flex flex-col justify-between overflow-hidden rounded-[14px] border border-navy/[0.06] bg-paper p-[0.9em] text-navy ${className}`}
      style={style}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[0.32em]" style={{ background: strip[tone] }} />
      <div className="flex items-center justify-between">
        <span className="text-[0.55em] font-semibold tracking-[0.16em] text-muted uppercase">{tag}</span>
        <span aria-hidden className="size-[0.45em] rounded-full" style={{ background: strip[tone] }} />
      </div>
      <div>
        <p className="font-display text-[1.25em] leading-[1.05] font-extrabold tracking-[-0.03em]">{en}</p>
        {showPl && <p className="serif-accent mt-[0.2em] text-[0.85em] text-blue">{pl}</p>}
      </div>
    </div>
  )
}
