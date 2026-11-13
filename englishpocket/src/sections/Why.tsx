import { Tidy } from '../components/Tidy'
import { useRef } from 'react'
import { useI18n } from '../i18n/I18n'
import { gsap, prefersReduced, useGSAP } from '../lib/gsap'

const ACCENTS = ['#DCD5FF', '#FFD978', '#4978FF', '#17243A']

export function Why() {
  const { t } = useI18n()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReduced()) return
      const q = gsap.utils.selector(root)
      q<HTMLElement>('.why-row').forEach((row) => {
        gsap.from(row.querySelectorAll('.why-anim'), {
          y: 50,
          opacity: 0,
          stagger: 0.07,
          duration: 1.1,
          scrollTrigger: { trigger: row, start: 'top 88%' },
        })
        gsap.from(row.querySelector('.why-rule'), { scaleX: 0, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: row, start: 'top 90%' } })
      })
      gsap.to(q('.why-big'), { xPercent: -18, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative overflow-hidden py-24 md:py-36">
      <p aria-hidden className="why-big pointer-events-none absolute top-10 left-0 font-display text-[22vw] leading-none font-extrabold tracking-[-0.07em] whitespace-nowrap text-navy/[0.035]">
        bez limitów · bez limitów
      </p>
      <div className="relative container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <p className="eyebrow">
              <span className="text-blue">●</span> {t.why.eyebrow}
            </p>
            <h2 className="mt-5 font-display text-[clamp(2.3rem,4.6vw,4rem)] leading-[0.98] font-extrabold tracking-[-0.045em]">
              <Tidy>{t.why.title[0]}</Tidy> <span className="serif-accent font-normal text-blue">{t.why.title[1]}</span>
            </h2>
          </div>
        </div>

        <ol className="lg:col-span-8">
          {t.why.items.map((it, i) => (
            <li key={it.title} className="why-row group relative">
              <span aria-hidden className="why-rule absolute inset-x-0 top-0 h-px origin-left bg-navy/15" />
              <div className="relative grid grid-cols-[3rem_1fr] gap-x-4 py-9 md:grid-cols-[5rem_1fr_15rem] md:items-center md:py-11">
                <span
                  aria-hidden
                  className="absolute inset-0 -z-0 origin-bottom scale-y-0 rounded-3xl transition-transform duration-700 ease-out-expo group-hover:scale-y-100"
                  style={{ background: `${ACCENTS[i]}${i > 1 ? '14' : '55'}` }}
                />
                <span className="why-anim relative font-display text-sm font-bold text-blue md:pl-5">0{i + 1}</span>
                <h3 className="why-anim relative font-display text-[clamp(2rem,5vw,4.2rem)] leading-[0.98] font-extrabold tracking-[-0.05em] transition-transform duration-700 ease-out-expo md:group-hover:translate-x-4">
                  {it.title}
                  <span className="serif-accent ml-3 inline-block align-middle text-[0.4em] font-normal tracking-normal text-blue opacity-100 transition-[opacity,transform] duration-700 ease-out-expo md:-translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                    — {it.word}
                  </span>
                </h3>
                <p className="why-anim relative col-start-2 mt-3 max-w-sm leading-relaxed text-muted md:col-start-3 md:mt-0 md:pr-5">{it.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
