import { COMPANY, CONTACT, NAV, SOCIALS } from '../data/site'
import { Logo } from '../components/Logo'

const YEAR = new Date().getFullYear()

export function Footer({ home = true }: { home?: boolean }) {
  const prefix = home ? '' : '/'

  return (
    <footer className="relative overflow-hidden border-t border-line/60 pt-20 md:pt-28">
      <div className="container-x">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="max-w-sm font-display text-2xl font-medium leading-tight tracking-tight md:text-3xl">
              Podłączamy Twoją firmę do internetu<span className="text-lime">.</span>
            </p>
            <a
              href={`${prefix}#kontakt`}
              className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-lime px-6 font-display font-medium text-ink transition-colors hover:bg-paper"
            >
              Rozpocznij projekt
            </a>
          </div>

          <nav aria-label="Stopka — nawigacja" className="md:col-span-2">
            <p className="eyebrow">Strona</p>
            <ul className="mt-5 space-y-2.5">
              {NAV.map((n) => (
                <li key={n.id}>
                  <a href={`${prefix}${n.href}`} className="text-mist transition-colors hover:text-paper">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="eyebrow">Kontakt</p>
            <ul className="mt-5 space-y-2.5">
              <li>
                <a href={`mailto:${CONTACT.email}`} className="text-mist transition-colors hover:text-paper">
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <a href={CONTACT.siteUrl} className="text-mist transition-colors hover:text-paper">
                  {CONTACT.site}
                </a>
              </li>
            </ul>
            <p className="eyebrow mt-8">Social media</p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-mist transition-colors hover:text-paper">
                    {s.label}
                    <span className="sr-only"> — {s.handle} (otwiera się w nowej karcie)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow">Informacje</p>
            <ul className="mt-5 space-y-2.5">
              <li>
                <a href="/polityka-prywatnosci" className="text-mist transition-colors hover:text-paper">
                  Polityka prywatności
                </a>
              </li>
              <li>
                <a href="/informacje-prawne" className="text-mist transition-colors hover:text-paper">
                  Informacje prawne
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Big wordmark — the brand cable plugs into the final "o" */}
      <div aria-hidden className="container-x mt-20 select-none overflow-hidden pb-4 md:mt-28">
        <Logo className="text-[clamp(4.5rem,17vw,17rem)] leading-[0.85] text-paper" />
      </div>

      <div data-chat-avoid className="container-x flex flex-col gap-3 border-t border-line/60 py-8 text-sm text-mist md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p suppressHydrationWarning>© {YEAR} Stronivo. Wszelkie prawa zastrzeżone.</p>
          <p className="text-xs">
            Usługi świadczy {COMPANY.shortName}, NIP {COMPANY.nip}, {COMPANY.street}, {COMPANY.city}
          </p>
        </div>
        <a href="#start" className="transition-colors hover:text-paper">
          Wróć na górę ↑
        </a>
      </div>
    </footer>
  )
}
