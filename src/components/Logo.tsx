/** Wordmark: "Stronivo" with a lime cable drawn through the "o" — echoing the brand mark. */
export function Logo({ className = '', withCable = true }: { className?: string; withCable?: boolean }) {
  return (
    <span className={`relative inline-flex items-center font-display font-bold tracking-[-0.045em] ${className}`}>
      <span>Stroniv</span>
      <span className="relative">
        o
        {withCable && (
          <svg aria-hidden viewBox="0 0 40 24" className="absolute -right-[0.95em] top-[0.12em] h-[0.62em] w-[1em] overflow-visible text-lime">
            <path d="M2 14c6 0 8-9 16-9h8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="25" y="1" width="10" height="9" rx="2" fill="currentColor" />
            <path d="M35 4h3M35 7h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </span>
  )
}
