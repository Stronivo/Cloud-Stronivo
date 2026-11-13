import type { ReactNode } from 'react'

/**
 * Renders assistant text WITHOUT innerHTML. Supports paragraphs, "- " lists and **bold**.
 * Only allow-listed links become clickable (site pages, e-mail, demo projects); everything
 * else stays plain text — model output can never inject markup or arbitrary links.
 */
const ALLOWED = [
  /^https:\/\/(www\.)?stronivo\.com(\/[\w\-./#?=&%]*)?$/,
  /^https:\/\/easybusy\.lovable\.app\/?$/,
  /^https:\/\/bellaitaliaweb\.lovable\.app\/?$/,
  /^mailto:kontakt@stronivo\.com$/,
]
const TOKEN = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+|mailto:[^\s)]+|kontakt@stronivo\.com)/g

function linkFor(raw: string): { href: string; label: string; external: boolean } | null {
  const url = raw.replace(/[.,;:!?]+$/, '')
  if (url === 'kontakt@stronivo.com') return { href: 'mailto:kontakt@stronivo.com', label: url, external: false }
  if (!ALLOWED.some((re) => re.test(url))) return null
  const internal = /^https:\/\/(www\.)?stronivo\.com/.test(url)
  return {
    href: internal ? url.replace(/^https:\/\/(www\.)?stronivo\.com/, '') || '/' : url,
    label: url.replace(/^mailto:/, '').replace(/^https:\/\//, ''),
    external: !internal && !url.startsWith('mailto:'),
  }
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let i = 0
  for (const part of text.split(TOKEN)) {
    if (!part) continue
    const k = `${key}-${i++}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      out.push(<strong key={k} className="font-semibold text-paper">{part.slice(2, -2)}</strong>)
      continue
    }
    const link = /^(https?:|mailto:|kontakt@)/.test(part) ? linkFor(part) : null
    if (link) {
      const trailing = part.slice(part.replace(/[.,;:!?]+$/, '').length)
      out.push(
        <a
          key={k}
          href={link.href}
          {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="break-words text-lime underline decoration-lime/40 underline-offset-2 hover:decoration-lime"
        >
          {link.label}
        </a>,
      )
      if (trailing) out.push(trailing)
      continue
    }
    out.push(part)
  }
  return out
}

export function FormattedText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim())
        if (lines.length && lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return (
            <ul key={bi} className="my-1.5 space-y-1 pl-4 marker:text-lime [list-style:disc]">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-•*]\s+/, ''), `${bi}-${li}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bi} className="[&:not(:first-child)]:mt-2">
            {lines.map((l, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ''), `${bi}-${li}`)}
              </span>
            ))}
          </p>
        )
      })}
    </>
  )
}
