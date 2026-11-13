import { Tidy } from '../components/Tidy'
import { useRef } from 'react'
import { LogoMark } from '../components/Logo'
import { useI18n } from '../i18n/I18n'
import { gsap, prefersReduced, useGSAP } from '../lib/gsap'

export function About() {
  const { t, lang } = useI18n()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReduced()) return
      const q = gsap.utils.selector(root)
      // words of the body light up as you scroll
      gsap.fromTo(
        q('.ab-word'),
        { opacity: 0.18 },
        { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: q('.ab-body')[0], start: 'top 80%', end: 'bottom 55%', scrub: true } },
      )
      gsap.from(q('.ab-page'), {
        rotate: -14,
        y: 120,
        opacity: 0,
        duration: 1.5,
        stagger: 0.12,
        scrollTrigger: { trigger: q('.ab-visual')[0], start: 'top 80%' },
      })
      gsap.to(q('.ab-page-1'), { yPercent: -10, ease: 'none', scrollTrigger: { trigger: root.current, scrub: true } })
      gsap.to(q('.ab-page-2'), { yPercent: 8, ease: 'none', scrollTrigger: { trigger: root.current, scrub: true } })
    },
    { scope: root, dependencies: [lang], revertOnUpdate: true },
  )

  return (
    <section id="o-nas" ref={root} className="relative scroll-mt-20 bg-cream/70 py-24 md:py-36">
      <div className="container-x grid items-center gap-16 lg:grid-cols-12">
        <div className="ab-visual relative order-2 h-[26rem] lg:order-1 lg:col-span-5 lg:h-[34rem]" aria-hidden>
          <div className="ab-page ab-page-2 ruled shadow-object absolute top-[6%] left-[16%] h-[78%] w-[66%] rotate-[7deg] rounded-[18px] bg-paper p-7">
            <p className="serif-accent text-2xl text-blue">{t.about.note}</p>
            <p className="mt-4 font-display text-lg leading-[1.6] font-semibold whitespace-pre-line text-navy/80">{t.about.margin}</p>
          </div>
          <div className="ab-page ab-page-1 shadow-object absolute bottom-[4%] left-0 flex h-[62%] w-[58%] -rotate-[5deg] flex-col justify-between overflow-hidden rounded-[22px] bg-blue p-7 text-white">
            <div className="absolute inset-3 rounded-[16px] border-2 border-dashed border-white/40" />
            <LogoMark className="relative w-16" />
            <p className="relative font-display text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.05] font-extrabold tracking-[-0.03em]">
              learn
              <br />
              <span className="serif-accent font-normal text-yellow">your way.</span>
            </p>
          </div>
          <span className="ab-page absolute top-[2%] right-[6%] grid size-20 rotate-12 place-items-center rounded-full bg-yellow font-display text-sm font-extrabold text-navy shadow-card">
            PL ⇄ EN
          </span>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-7 lg:pl-8">
          <p className="eyebrow">
            <span className="text-blue">●</span> {t.about.eyebrow}
          </p>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,5.4vw,4.8rem)] leading-[0.96] font-extrabold tracking-[-0.05em]">
            <Tidy>{t.about.title}</Tidy>
          </h2>
          <p className="ab-body mt-8 font-display text-[clamp(1.2rem,2vw,1.6rem)] leading-[1.45] font-medium tracking-[-0.01em] text-navy">
            {t.about.body.split(' ').map((w, i) => (
              <span key={i} className="ab-word">
                {w}{' '}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}
