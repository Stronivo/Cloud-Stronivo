const ITEMS = ['Strony internetowe', 'Landing page', 'Odświeżanie stron', 'SEO i optymalizacja']

/** Decorative band — the same words are already present as real content in the Services section. */
export function Marquee() {
  const row = (
    <div className="flex shrink-0 items-center">
      {ITEMS.map((t) => (
        <span key={t} className="flex items-center">
          <span className="px-6 font-display text-[clamp(2.6rem,7vw,6.5rem)] font-semibold tracking-[-0.04em] text-transparent [-webkit-text-stroke:1.5px_#3a414c] md:px-10">
            {t}
          </span>
          <svg viewBox="0 0 40 24" className="h-6 w-10 shrink-0 md:h-9 md:w-14">
            <path d="M0 12 H22" stroke="#c6ff4d" strokeWidth="3" strokeLinecap="round" />
            <rect x="20" y="5" width="12" height="14" rx="3" fill="#c6ff4d" />
            <path d="M32 9 h6 M32 15 h6" stroke="#c6ff4d" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </div>
  )
  return (
    <div aria-hidden className="overflow-hidden border-y border-line/60 py-8 md:py-12">
      <div className="marquee flex w-max">
        {row}
        {row}
      </div>
    </div>
  )
}
