import { Tidy } from '../components/Tidy'
import { useRef } from 'react'
import { ContactForm } from '../components/ContactForm'
import { MagneticLink } from '../components/Magnetic'
import { WordCard } from '../components/WordCard'
import { CONTACT } from '../data/site'
import { useI18n } from '../i18n/I18n'
import { gsap, prefersReduced, useGSAP } from '../lib/gsap'

const RETURNING = [
  { en: 'freedom', pl: 'wolność', tone: 'lavender' as const, x: -340, y: -150, r: -14 },
  { en: 'confident', pl: 'pewny siebie', tone: 'blue' as const, x: 320, y: -170, r: 12 },
  { en: 'pocket', pl: 'kieszeń', tone: 'yellow' as const, x: -300, y: 60, r: 9 },
  { en: 'your pace', pl: 'twoje tempo', tone: 'ivory' as const, x: 300, y: 40, r: -8 },
]

export function Final() {
  const { t } = useI18n()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReduced()) return
      const q = gsap.utils.selector(root)
      const mobile = window.matchMedia('(max-width: 767px)').matches
      const k = mobile ? 0.45 : 1
      // cards return into the notebook — closing the story that began in the hero
      const tl = gsap.timeline({ scrollTrigger: { trigger: q('.fn-stage')[0], start: 'top 85%', end: 'center 45%', scrub: 0.8 } })
      tl.fromTo(
        q('.fn-card'),
        { x: (i) => RETURNING[i].x * k, y: (i) => RETURNING[i].y * k - 40, rotate: (i) => RETURNING[i].r, scale: 1, opacity: 1 },
        { x: 0, y: 40, rotate: 0, scale: 0.3, opacity: 0, stagger: 0.08, ease: 'power2.in' },
      )
        .fromTo(q('.fn-flap'), { rotateX: -150 }, { rotateX: 0, duration: 0.3 }, 0.6)
        .fromTo(q('.fn-glow'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1.2, duration: 0.4 }, 0.6)
      gsap.from(q('.fn-title .mask-inner'), { yPercent: 110, stagger: 0.1, duration: 1.2, scrollTrigger: { trigger: q('.fn-title')[0], start: 'top 85%' } })
    },
    { scope: root },
  )

  return (
    <section id="kontakt" ref={root} className="relative scroll-mt-20 overflow-hidden bg-lavender/45 pt-24 pb-20 md:pt-36">
      <div className="container-x text-center">
        <div className="fn-stage relative mx-auto h-56 max-w-3xl md:h-72" aria-hidden>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 [perspective:800px]">
            <div className="fn-glow absolute inset-[-40%] rounded-full bg-yellow/70 blur-3xl" />
            <div className="relative h-28 w-40 md:h-32 md:w-48">
              <div className="absolute inset-0 rounded-b-[30px] rounded-t-[10px] bg-blue shadow-object">
                <div className="absolute inset-3 rounded-b-[22px] rounded-t-[6px] border-2 border-dashed border-white/50" />
              </div>
              <div className="fn-flap absolute inset-x-0 top-0 h-9 origin-top rounded-b-[14px] rounded-t-[10px] bg-blue-ink shadow-card motion-reduce:hidden" />
            </div>
          </div>
          {RETURNING.map((c) => (
            <div key={c.en} className="fn-card absolute bottom-10 left-1/2 -ml-[5.5rem]" style={{ transform: `translate(${c.x}px, ${c.y}px) rotate(${c.r}deg)` }}>
              <WordCard en={c.en} pl={c.pl} tone={c.tone} className="h-[6.5rem] w-[11rem] text-[0.95rem] motion-reduce:hidden" />
            </div>
          ))}
        </div>

        <h2 className="fn-title mt-12 font-display text-[clamp(3rem,10vw,9rem)] leading-[0.9] font-extrabold tracking-[-0.06em] text-navy">
          <span className="mask-line">
            <span className="mask-inner block"><Tidy>{t.final.title[0]}</Tidy></span>
          </span>
          <span className="mask-line">
            <span className="mask-inner serif-accent block font-normal text-blue">{t.final.title[1]}</span>
          </span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-lg text-muted md:text-xl">{t.final.lead}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <MagneticLink href="#materialy">{t.final.cta}</MagneticLink>
          <MagneticLink href="#formularz" variant="ghost" arrow={false}>
            {t.final.contact}
          </MagneticLink>
        </div>
      </div>

      <div id="formularz" className="container-x mt-24 scroll-mt-28 md:mt-32">
        <div className="grid gap-10 rounded-[36px] bg-ivory p-6 shadow-[0_30px_80px_-50px_rgb(23_36_58/0.5)] sm:p-10 lg:grid-cols-12 lg:p-14">
          <div className="lg:col-span-5">
            <p className="eyebrow">
              <span className="text-blue">●</span> {t.contact.eyebrow}
            </p>
            <h3 className="mt-4 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1] font-extrabold tracking-[-0.04em]"><Tidy>{t.contact.title}</Tidy></h3>
            {CONTACT.email && (
              <a href={`mailto:${CONTACT.email}`} className="link-u mt-6 inline-block font-display text-xl font-bold text-blue">
                {CONTACT.email}
              </a>
            )}
          </div>
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  )
}
