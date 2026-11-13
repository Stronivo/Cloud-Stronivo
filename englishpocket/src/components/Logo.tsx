/** EnglishPocket mark redrawn as SVG from the brand logo: a stitched pocket holding an open book. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 60" className={className} aria-hidden>
      <path d="M12 8.5h7v14h-7z" fill="#1EC3CF" stroke="#17243A" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M44 12.5l6.5-1.6v12H42z" fill="#8FE6EE" stroke="#17243A" strokeWidth="2.4" strokeLinejoin="round" />
      <path
        d="M19 5.2c5 .2 9.6 1.6 13 4.4 3.4-2.8 8-4.2 13-4.4v20H19z"
        fill="#fff"
        stroke="#17243A"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M32 9.6v15" stroke="#17243A" strokeWidth="2" />
      <path d="M23 12c2-.6 4-.5 5.6.3M23 16c2-.6 4-.5 5.6.3M35.4 12.3c1.6-.8 3.6-.9 5.6-.3M35.4 16.3c1.6-.8 3.6-.9 5.6-.3" stroke="#A3ADC2" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path
        d="M7.5 22.5c0-1.6 1.4-2.8 3-2.5L32 24.4 53.5 20c1.6-.3 3 .9 3 2.5v16.6c0 2.6-1.4 5-3.7 6.2L34.8 54.6a6 6 0 0 1-5.6 0L11.2 45.3a7 7 0 0 1-3.7-6.2z"
        fill="#1F5FD1"
        stroke="#17243A"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M32 24.4v30.8" stroke="#17243A" strokeOpacity=".18" strokeWidth="2" />
      <path
        d="M12.5 25.5 32 29.4l19.5-3.9v13c0 1.7-.9 3.2-2.4 4L33.4 49.6a3 3 0 0 1-2.8 0L14.9 42.5a4.5 4.5 0 0 1-2.4-4z"
        fill="none"
        stroke="#fff"
        strokeOpacity=".85"
        strokeWidth="1.5"
        strokeDasharray="3.2 2.8"
        strokeLinecap="round"
      />
      <path d="M56 2.5c.5 3 1.6 4.1 4.6 4.6-3 .5-4.1 1.6-4.6 4.6-.5-3-1.6-4.1-4.6-4.6 3-.5 4.1-1.6 4.6-4.6z" fill="#FFC93C" />
    </svg>
  )
}

export function Logo({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-[1.6em] w-auto shrink-0" />
      <span className="font-display text-[1em] font-extrabold tracking-[-0.03em]">
        <span className={tone === 'dark' ? 'text-navy' : 'text-ivory'}>English</span>
        <span className="text-[#12B5C4]">Pocket</span>
      </span>
    </span>
  )
}
