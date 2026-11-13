import { Logo } from '../components/Logo'
import { PRODUCT_LOOKS } from '../data/products'
import { COMPANY, CONTACT, SOCIALS } from '../data/site'
import { SLOGAN_LINE } from '../i18n/dict'
import { useI18n } from '../i18n/I18n'
import { useShop } from '../lib/shop'

export function Footer({ home = true }: { home?: boolean }) {
  const { t } = useI18n()
  const shop = useShop()
  const prefix = home ? '' : '/'
  const year = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden bg-navy pt-20 pb-10 text-ivory">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <a href={`${prefix}#start`} className="text-2xl" aria-label="EnglishPocket — strona główna">
              <Logo tone="light" />
            </a>
            <p lang="pl" className="serif-accent mt-6 max-w-sm text-[1.7rem] leading-[1.15] text-ivory/90">
              „{SLOGAN_LINE}”
            </p>
          </div>

          <nav aria-label={t.footer.categories} className="lg:col-span-3">
            <h2 className="eyebrow !text-ivory/50">{t.footer.categories}</h2>
            <ul className="mt-5 space-y-2.5">
              {PRODUCT_LOOKS.map((l) => (
                <li key={l.slug}>
                  {home ? (
                    <button type="button" onClick={() => shop.openDetail(l.slug)} className="link-u text-left text-ivory/80 hover:text-ivory">
                      {shop.products[l.slug]?.name || l.name}
                    </button>
                  ) : (
                    <a href="/#materialy" className="link-u text-ivory/80 hover:text-ivory">
                      {l.name}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t.footer.info} className="lg:col-span-2">
            <h2 className="eyebrow !text-ivory/50">{t.footer.info}</h2>
            <ul className="mt-5 space-y-2.5">
              <li><a href="/regulamin" className="link-u text-ivory/80 hover:text-ivory">{t.footer.terms}</a></li>
              <li><a href="/regulamin#produkty-cyfrowe" className="link-u text-ivory/80 hover:text-ivory">{t.footer.digital}</a></li>
              <li><a href="/polityka-prywatnosci" className="link-u text-ivory/80 hover:text-ivory">{t.footer.privacy}</a></li>
            </ul>
          </nav>

          <div className="lg:col-span-2">
            <h2 className="eyebrow !text-ivory/50">{t.footer.contact}</h2>
            <ul className="mt-5 space-y-2.5">
              {CONTACT.email && (
                <li><a href={`mailto:${CONTACT.email}`} className="link-u break-all text-ivory/80 hover:text-ivory">{CONTACT.email}</a></li>
              )}
              <li><a href={`${prefix}#formularz`} className="link-u text-ivory/80 hover:text-ivory">{t.footer.contactForm}</a></li>
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-u text-ivory/80 hover:text-ivory">{s.label} ↗</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p aria-hidden className="mt-20 font-display text-[clamp(3.4rem,13.5vw,13rem)] leading-[0.8] font-extrabold tracking-[-0.07em] text-ivory/[0.06] select-none">
          EnglishPocket
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-ivory/55">
          <p>
            © {year} EnglishPocket{COMPANY.name ? ` · ${COMPANY.name}` : ''}. {t.footer.rights}
          </p>
          <a href="#start" onClick={(e) => { if (!home) return; e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="link-u hover:text-ivory">
            {t.footer.top} ↑
          </a>
        </div>
      </div>
    </footer>
  )
}
