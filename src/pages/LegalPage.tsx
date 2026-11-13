import { useEffect, type ReactNode } from 'react'
import { COMPANY, CONTACT, SOCIALS } from '../data/site'
import { PRIVACY, PRIVACY_UPDATED, PRIVACY_UPDATED_ISO, type Block } from '../data/privacy'

const PAGES = {
  '/polityka-prywatnosci': { title: 'Polityka Prywatności Stronivo', doc: 'Polityka prywatności' },
  '/informacje-prawne': { title: 'Informacje prawne', doc: 'Informacje prawne' },
} as const

export type LegalPath = keyof typeof PAGES
export const isLegalPath = (p: string): p is LegalPath => p in PAGES

const link = 'text-paper underline decoration-line underline-offset-4 transition-colors hover:text-lime hover:decoration-lime'

/** Turns the e-mail address and site URL inside policy text into real links. */
function linkify(text: string): ReactNode[] {
  return text.split(/(kontakt@stronivo\.com|https:\/\/stronivo\.com)/g).map((part, i) => {
    if (part === CONTACT.email)
      return (
        <a key={i} href={`mailto:${CONTACT.email}`} className={link}>
          {part}
        </a>
      )
    if (part === 'https://stronivo.com')
      return (
        <a key={i} href="/" className={link}>
          {part}
        </a>
      )
    return part
  })
}

export function LegalPage({ path }: { path: LegalPath }) {
  const page = PAGES[path]
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  return path === '/polityka-prywatnosci' ? <Privacy title={page.title} /> : <LegalInfo title={page.title} />
}

function Header({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-line/60 pb-12 md:pb-16">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="legal-title" className="mt-6 max-w-5xl text-[clamp(2.4rem,6.4vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
        {title}
      </h1>
      {children}
    </header>
  )
}

function Privacy({ title }: { title: string }) {
  return (
    <article aria-labelledby="legal-title" className="container-x pb-28 pt-36 md:pt-48">
      <Header eyebrow="Dokumenty" title={title}>
        <p className="mt-6 text-mist">
          Data ostatniej aktualizacji: <time dateTime={PRIVACY_UPDATED_ISO}>{PRIVACY_UPDATED}</time>
        </p>
      </Header>

      <div className="mt-12 grid gap-12 md:mt-16 lg:grid-cols-12">
        <nav aria-label="Spis treści" className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">Spis treści</p>
            <ol className="mt-5 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {[...PRIVACY, { no: '§16', title: 'Kontakt z administratorem' }].map((s) => (
                <li key={s.no}>
                  <a
                    href={`#${anchor(s.no)}`}
                    className="flex gap-3 rounded-lg py-1.5 text-sm text-mist transition-colors hover:text-paper"
                  >
                    <span className="w-8 shrink-0 font-display tabular-nums text-lime">{s.no}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="max-w-3xl lg:col-span-8">
          {PRIVACY.map((s) => (
            <section key={s.no} id={anchor(s.no)} aria-labelledby={`${anchor(s.no)}-h`} className="scroll-mt-28 border-b border-line/60 py-10 first:pt-0">
              <h2 id={`${anchor(s.no)}-h`} className="flex gap-4 text-2xl font-semibold tracking-tight md:text-3xl">
                <span className="text-lime">{s.no}.</span>{' '}
                {s.title}
              </h2>
              <div className="mt-6 space-y-5 leading-relaxed text-mist">
                {s.blocks.map((b, i) => (
                  <PolicyBlock key={i} block={b} />
                ))}
              </div>
            </section>
          ))}

          <section id={anchor('§16')} aria-labelledby="p16-h" className="scroll-mt-28 py-10">
            <h2 id="p16-h" className="flex gap-4 text-2xl font-semibold tracking-tight md:text-3xl">
              <span className="text-lime">§16.</span>{' '}
              Kontakt z administratorem
            </h2>
            <p className="mt-6 leading-relaxed text-mist">
              W sprawach związanych z ochroną danych osobowych i niniejszą Polityką Prywatności można kontaktować się pod
              następującymi danymi:
            </p>
            <CompanyCard />
          </section>
        </div>
      </div>
    </article>
  )
}

function PolicyBlock({ block: b }: { block: Block }) {
  if ('ol' in b)
    return (
      <ol className="list-decimal space-y-3 pl-6 marker:font-display marker:text-lime">
        {b.ol.map((t) => (
          <li key={t} className="pl-2">
            {linkify(t)}
          </li>
        ))}
      </ol>
    )
  if ('ul' in b)
    return (
      <ul className="list-disc space-y-2 pl-6 marker:text-lime">
        {b.ul.map((t) => (
          <li key={t} className="pl-2">
            {t}
          </li>
        ))}
      </ul>
    )
  if ('h' in b)
    return (
      <div className="rounded-2xl border border-line p-5 md:p-6">
        <h3 className="font-display text-lg font-semibold text-paper">{b.h}</h3>
        <p className="mt-2">{b.p}</p>
        <p className="mt-3 text-sm">
          <span className="text-paper">Podstawa prawna:</span> {b.basis}
        </p>
      </div>
    )
  return <p>{linkify(b.p)}</p>
}

function CompanyCard() {
  const rows: [string, ReactNode][] = [
    ['Marka', 'Stronivo'],
    ['Administrator', COMPANY.name],
    ['NIP', COMPANY.nip],
    ['Adres', `${COMPANY.street}, ${COMPANY.city}`],
    [
      'Strona internetowa',
      <a key="w" href="/" className={link}>
        https://stronivo.com
      </a>,
    ],
    [
      'Adres e-mail',
      <a key="e" href={`mailto:${CONTACT.email}`} className={link}>
        {CONTACT.email}
      </a>,
    ],
  ]
  return (
    <dl className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6 md:px-6">
          <dt className="text-sm text-mist">{k}</dt>
          <dd className="break-words text-paper">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function LegalInfo({ title }: { title: string }) {
  return (
    <article aria-labelledby="legal-title" className="container-x pb-28 pt-36 md:pt-48">
      <Header eyebrow="Dokumenty" title={title} />
      <div className="mt-12 grid gap-12 md:mt-16 lg:grid-cols-12">
        <div className="max-w-3xl lg:col-span-8 lg:col-start-5">
          <p className="text-lg leading-relaxed text-mist">
            Stronivo to marka specjalizująca się w projektowaniu, tworzeniu i wdrażaniu stron internetowych oraz świadczeniu
            powiązanych usług cyfrowych. Usługi oferowane pod marką Stronivo są świadczone w ramach działalności
            gospodarczej prowadzonej przez:
          </p>
          <CompanyCard />

          <h2 className="mt-14 text-2xl font-semibold tracking-tight">Media społecznościowe</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm transition-colors hover:border-lime hover:text-lime"
                >
                  {s.label} <span className="text-mist">· {s.handle}</span>
                  <span className="sr-only">(otwiera się w nowej karcie)</span>
                </a>
              </li>
            ))}
          </ul>

          <h2 className="mt-14 text-2xl font-semibold tracking-tight">Ochrona danych osobowych</h2>
          <p className="mt-4 leading-relaxed text-mist">
            Zasady przetwarzania danych osobowych opisuje{' '}
            <a href="/polityka-prywatnosci" className={link}>
              Polityka Prywatności
            </a>
            .
          </p>

          <p className="mt-14 text-sm text-mist">© 2026 Stronivo. Wszelkie prawa zastrzeżone.</p>
        </div>
      </div>
    </article>
  )
}

const anchor = (no: string) => `p${no.replace('§', '')}`
