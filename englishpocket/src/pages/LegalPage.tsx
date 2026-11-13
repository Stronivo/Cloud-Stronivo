import { useEffect } from 'react'
import { COMPANY } from '../data/site'
import type { LegalDoc } from '../data/legal'
import { useI18n } from '../i18n/I18n'

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { t } = useI18n()
  useEffect(() => {
    document.title = `${doc.title} — EnglishPocket`
    const hash = window.location.hash.slice(1)
    if (hash) document.getElementById(hash)?.scrollIntoView()
  }, [doc.title])

  return (
    <main id="tresc" lang="pl" className="container-x pt-36 pb-24">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="link-u text-sm font-semibold text-blue">← {t.legal.back}</a>
        {!COMPANY.name && (
          <p role="note" className="mt-8 rounded-2xl border border-yellow bg-yellow/25 px-5 py-4 text-sm font-medium text-navy">
            {t.legal.draft}
          </p>
        )}
        <h1 className="mt-8 font-display text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.98] font-extrabold tracking-[-0.045em]">{doc.title}</h1>
        <div className="mt-12 space-y-10">
          {doc.sections.map((s) => (
            <section key={s.heading} id={s.id} className="scroll-mt-28">
              <h2 className="font-display text-xl font-bold text-navy">{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-navy/80">{p}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
