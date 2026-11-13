import { CONTACT, SOCIALS } from '../data/site'
import { MagneticLink } from '../components/Magnetic'
import { Reveal } from '../components/Reveal'
import { useInView } from '../hooks/useInView'
import { ContactForm } from '../components/ContactForm'

export function Contact() {
  const [headRef, headIn] = useInView<HTMLHeadingElement>({ threshold: 0.6 })

  return (
    <section id="kontakt" aria-labelledby="contact-title" className="relative overflow-hidden border-t border-line/60 pb-24 pt-36 md:pb-36 md:pt-56">
      <div className="container-x">
        <p className="eyebrow mb-8">
          <span className="text-lime">06</span> — Kontakt
        </p>

        <h2
          ref={headRef}
          id="contact-title"
          className={`group/h text-[clamp(2.9rem,9.6vw,10rem)] font-bold leading-[0.9] tracking-[-0.055em] ${headIn ? 'is-in' : ''}`}
        >
          <span className="block">
            <span className="split-word">
              <span style={{ '--i': 0 } as React.CSSProperties}>Gotowy</span>
            </span>{' '}
            <span className="split-word">
              <span style={{ '--i': 1 } as React.CSSProperties}>podłączyć</span>
            </span>
            <Socket on={headIn} />
          </span>{' '}
          <span className="block">
            <span className="split-word">
              <span style={{ '--i': 2 } as React.CSSProperties}>swój</span>
            </span>{' '}
            <span className="split-word">
              <span style={{ '--i': 3 } as React.CSSProperties}>
                biznes<span className="text-lime">?</span>
              </span>
            </span>
          </span>
        </h2>

        <div className="mt-12 grid gap-10 md:mt-16 md:grid-cols-12 md:items-end">
          <Reveal className="md:col-span-6" delay={150}>
            <p className="max-w-lg text-lg leading-relaxed text-mist md:text-xl">
              Opowiedz nam o swoim pomyśle. Razem stworzymy stronę, która zrobi różnicę.
            </p>
          </Reveal>
          <Reveal className="flex flex-wrap gap-3 md:col-span-6 md:justify-end md:gap-4" delay={250}>
            <MagneticLink href="#formularz">Napisz do nas</MagneticLink>
            <MagneticLink href="#realizacje" variant="ghost">
              Zobacz realizacje
            </MagneticLink>
          </Reveal>
        </div>

        <div className="mt-24 grid gap-14 border-t border-line pt-14 md:mt-32 lg:grid-cols-12 lg:gap-10">
          <Reveal className="lg:col-span-4">
            <dl className="space-y-8">
              <div>
                <dt className="eyebrow">E-mail</dt>
                <dd className="mt-3">
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="font-display text-2xl font-medium tracking-tight underline decoration-line decoration-1 underline-offset-8 transition-colors hover:text-lime hover:decoration-lime md:text-3xl"
                  >
                    {CONTACT.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Strona</dt>
                <dd className="mt-3">
                  <a href={CONTACT.siteUrl} className="text-lg transition-colors hover:text-lime">
                    {CONTACT.site}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="eyebrow">Social media</dt>
                <dd className="mt-3">
                  <ul className="flex flex-wrap gap-2">
                    {SOCIALS.map((s) => (
                      <li key={s.label}>
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm transition-colors hover:border-lime hover:text-lime"
                        >
                          {s.label}
                          <span className="text-mist">· {s.handle}</span>
                          <span className="sr-only">(otwiera się w nowej karcie)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </Reveal>

          <div id="formularz" className="scroll-mt-28 lg:col-span-7 lg:col-start-6">
            <Reveal>
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

/** A socket set into the headline: a plug drops in from above when the heading comes into view. */
function Socket({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="relative ml-[0.14em] inline-block h-[0.7em] w-[0.45em] align-baseline">
      <svg aria-hidden viewBox="0 0 50 78" className="absolute inset-0 h-full w-full overflow-visible">
        {/* cable coming from above the section */}
        <g
          className="transition-transform duration-[1300ms] ease-out-expo"
          style={{ transform: on ? 'translateY(0)' : 'translateY(-60px)', transitionDelay: on ? '350ms' : '0ms' }}
        >
          <path d="M25 -900 V6" stroke="#06070a" strokeWidth="9" />
          <path d="M25 -900 V6" stroke="#2a3039" strokeWidth="6.5" />
          <path d="M23.5 -900 V6" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.5" />
          <rect x="15" y="0" width="20" height="26" rx="5" fill="#353b45" />
          <rect x="19" y="26" width="12" height="14" rx="2" fill="#b6bcc5" />
        </g>
        {/* socket body acting as the "?" dot + hook */}
        <rect x="6" y="34" width="38" height="44" rx="10" fill="#252a32" />
        <rect x="17" y="34" width="16" height="8" rx="2" fill="#050608" />
        <rect
          x="13"
          y="60"
          width="24"
          height="5"
          rx="2.5"
          className="transition-[fill] duration-500"
          style={{ fill: on ? '#c6ff4d' : '#3a414c', transitionDelay: on ? '1300ms' : '0ms' }}
        />
      </svg>
    </span>
  )
}
