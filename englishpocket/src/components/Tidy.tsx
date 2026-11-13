import { Fragment } from 'react'

/**
 * Plus Jakarta Sans at heavy weights with tight tracking leaves a visible gap
 * before "." and ",". Pull the punctuation back optically in display headings.
 */
export function Tidy({ children }: { children: string }) {
  const parts = children.split(/([.,!?])/)
  return (
    <>
      {parts.map((p, i) =>
        /^[.,!?]$/.test(p) ? (
          <span key={i} className="ml-[-0.09em]">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}
