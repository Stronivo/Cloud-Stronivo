import { useCallback, useEffect, useState } from 'react'
import { MagneticLink } from '../components/Magnetic'
import { WordCard } from '../components/WordCard'
import { useI18n } from '../i18n/I18n'

type State =
  | { s: 'checking' }
  | { s: 'paid'; email: string | null; links: { name: string; url: string }[] }
  | { s: 'processing' }
  | { s: 'expired' }
  | { s: 'error' }
  | { s: 'invalid' }

export function OrderPage() {
  const { t } = useI18n()
  const [state, setState] = useState<State>({ s: 'checking' })
  const sessionId = new URLSearchParams(window.location.search).get('session_id')

  const check = useCallback(async () => {
    if (!sessionId) return setState({ s: 'invalid' })
    setState({ s: 'checking' })
    try {
      const r = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`)
      const d = r.headers.get('content-type')?.includes('json') ? await r.json() : null
      if (!r.ok || !d?.ok) return setState({ s: r.status === 400 || r.status === 404 ? 'invalid' : 'error' })
      if (d.status === 'paid') {
        try {
          localStorage.removeItem('ep-cart')
        } catch {
          /* ignore */
        }
        return setState({ s: 'paid', email: d.email, links: d.links ?? [] })
      }
      setState({ s: d.status === 'expired' ? 'expired' : 'processing' })
    } catch {
      setState({ s: 'error' })
    }
  }, [sessionId])

  useEffect(() => {
    document.title = `${t.order.title} — EnglishPocket`
    check()
  }, [check, t.order.title])

  // poll a few times while the payment is still processing
  useEffect(() => {
    if (state.s !== 'processing') return
    const id = window.setTimeout(check, 4000)
    return () => window.clearTimeout(id)
  }, [state, check])

  return (
    <main id="tresc" className="container-x flex min-h-[80svh] items-center pt-36 pb-24">
      <div className="mx-auto w-full max-w-2xl text-center">
        <div aria-hidden className="relative mx-auto h-32 w-56">
          <WordCard en="thank you" pl="dziękuję" tone="yellow" className="absolute top-0 left-0 h-24 w-40 -rotate-6 text-sm" />
          <WordCard en="enjoy" pl="miłej nauki" tone="blue" className="absolute top-4 right-0 h-24 w-40 rotate-6 text-sm" />
        </div>
        <p className="eyebrow mt-10">{t.order.title}</p>
        <div aria-live="polite">
          {state.s === 'checking' && <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em]">{t.order.checking}</h1>}
          {state.s === 'paid' && (
            <>
              <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1] font-extrabold tracking-[-0.045em]">{t.order.paid}</h1>
              <p className="mt-4 text-lg text-muted">{t.order.paidLead(state.email)}</p>
              {state.links.length ? (
                <>
                  <ul className="mt-10 space-y-3 text-left">
                    {state.links.map((l) => (
                      <li key={l.url} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white/70 p-4 pl-6">
                        <span className="font-display font-bold text-navy">{l.name}</span>
                        <a href={l.url} className="inline-flex min-h-11 items-center rounded-full bg-blue px-5 font-display text-sm font-bold text-white hover:bg-blue-ink">
                          {t.order.download}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-muted">{t.order.linksNote}</p>
                </>
              ) : (
                <p className="mt-6 text-muted">{t.order.noLinks}</p>
              )}
            </>
          )}
          {state.s === 'processing' && (
            <>
              <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em]">{t.order.checking}</h1>
              <p className="mt-4 text-muted">{t.order.processing}</p>
            </>
          )}
          {(state.s === 'expired' || state.s === 'error' || state.s === 'invalid') && (
            <>
              <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em]">
                {state.s === 'expired' ? t.order.expired : state.s === 'invalid' ? t.order.invalid : t.order.error}
              </h1>
              {state.s === 'error' && (
                <button type="button" onClick={check} className="mt-6 font-semibold text-blue underline">
                  {t.order.retry}
                </button>
              )}
            </>
          )}
        </div>
        <div className="mt-12">
          <MagneticLink href="/#materialy" variant="dark">{t.order.back}</MagneticLink>
        </div>
      </div>
    </main>
  )
}
