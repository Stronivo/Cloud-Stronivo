import { useEffect } from 'react'
import { CONTACT } from '../data/site'

const PAGES = {
  '/polityka-prywatnosci': {
    title: 'Polityka prywatności',
    intro:
      'Ta strona jest przygotowana na dokument polityki prywatności Stronivo. Ostateczna treść musi zostać przygotowana lub zweryfikowana przez osobę odpowiedzialną za ochronę danych przed publikacją serwisu.',
    todo: [
      'Dane administratora danych osobowych (pełna nazwa, adres, NIP/REGON lub KRS).',
      'Cele i podstawy prawne przetwarzania danych z formularza kontaktowego (art. 6 RODO).',
      'Odbiorcy danych — w tym dostawca hostingu i usługi wysyłki wiadomości e-mail.',
      'Okres przechowywania danych oraz prawa osób, których dane dotyczą.',
      'Informacje o plikach cookies i narzędziach analitycznych (jeśli zostaną wdrożone).',
    ],
  },
  '/informacje-prawne': {
    title: 'Informacje prawne',
    intro:
      'Ta strona jest przygotowana na dane rejestrowe i informacje prawne Stronivo. Nie zawiera jeszcze ostatecznych danych — muszą one zostać uzupełnione przed publikacją serwisu.',
    todo: [
      'Pełna nazwa przedsiębiorcy i forma prowadzenia działalności.',
      'Adres siedziby / adres do doręczeń.',
      'Numery rejestrowe: NIP, REGON, KRS lub wpis do CEIDG.',
      'Informacje o prawach autorskich do treści serwisu.',
    ],
  },
} as const

export type LegalPath = keyof typeof PAGES
export const isLegalPath = (p: string): p is LegalPath => p in PAGES

export function LegalPage({ path }: { path: LegalPath }) {
  const page = PAGES[path]
  useEffect(() => {
    document.title = `${page.title} — Stronivo`
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [page.title])

  return (
    <section aria-labelledby="legal-title" className="container-x pb-28 pt-40 md:pt-48">
      <p className="eyebrow">Dokument w przygotowaniu</p>
      <h1 id="legal-title" className="mt-6 text-[clamp(2.6rem,7vw,6rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
        {page.title}
      </h1>
      <div role="note" className="mt-12 max-w-3xl rounded-2xl border border-dashed border-lime/50 p-6 md:p-8">
        <p className="font-medium text-lime">To nie jest jeszcze obowiązujący dokument.</p>
        <p className="mt-3 leading-relaxed text-mist">{page.intro}</p>
        <p className="mt-6 text-sm text-paper">Do uzupełnienia:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-mist marker:text-lime">
          {page.todo.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <p className="mt-10 text-mist">
        Pytania? Napisz:{' '}
        <a className="text-paper underline underline-offset-4 hover:text-lime" href={`mailto:${CONTACT.email}`}>
          {CONTACT.email}
        </a>
      </p>
      <a href="/" className="mt-10 inline-flex min-h-12 items-center rounded-full border border-line px-6 transition-colors hover:border-lime hover:text-lime">
        ← Wróć na stronę główną
      </a>
    </section>
  )
}
