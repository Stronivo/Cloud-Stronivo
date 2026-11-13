import { useRef } from 'react'
import { Book } from '../components/Book'
import { PRODUCT_LOOKS } from '../data/products'
import { useI18n } from '../i18n/I18n'
import { gsap, prefersReduced, useGSAP } from '../lib/gsap'

export function HowItWorks() {
  const { t } = useI18n()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReduced()) return
      const q = gsap.utils.selector(root)

      // Connecting path draws with scroll (both desktop + mobile variants)
      q<SVGPathElement>('.hw-path').forEach((p) => {
        const len = p.getTotalLength()
        gsap.fromTo(
          p,
          { strokeDasharray: len, strokeDashoffset: len },
          { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: q('.hw-steps')[0], start: 'top 75%', end: 'bottom 60%', scrub: 0.6 } },
        )
      })

      const stepTl = (sel: string) =>
        gsap.timeline({ defaults: { ease: 'power3.inOut' }, scrollTrigger: { trigger: q(sel)[0], start: 'top 82%', end: 'top 35%', scrub: 0.7 } })

      // 01 — covers arrange into a collection
      stepTl('.hw-1')
        .from(q('.hw-1 .cv'), {
          x: (i) => [-80, 10, 90][i],
          y: (i) => [-60, 70, -40][i],
          rotate: (i) => [-28, 18, 32][i],
          opacity: 0,
          stagger: 0.08,
          duration: 1,
        })
        .from(q('.hw-1 .hw-badge'), { scale: 0, opacity: 0, duration: 0.4 }, 0.8)

      // 02 — document travels into the download tray
      stepTl('.hw-2')
        .fromTo(q('.hw-2 .doc'), { y: -70, rotate: -10 }, { y: 30, rotate: 0, duration: 1 })
        .fromTo(q('.hw-2 .doc'), { opacity: 1 }, { opacity: 0, scale: 0.7, duration: 0.3 }, 0.85)
        .fromTo(q('.hw-2 .bar'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'none' }, 0.5)
        .fromTo(q('.hw-2 .done'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3 }, 1.2)

      // 03 — notebook opens with neat pages
      stepTl('.hw-3')
        .fromTo(q('.hw-3 .cover'), { rotateY: 0 }, { rotateY: -165, duration: 1 })
        .from(q('.hw-3 .line'), { scaleX: 0, stagger: 0.05, duration: 0.4 }, 0.55)

      gsap.from(q('.hw-copy'), { y: 40, opacity: 0, stagger: 0.12, duration: 1, scrollTrigger: { trigger: q('.hw-steps')[0], start: 'top 70%' } })
    },
    { scope: root },
  )

  const s = t.how.steps
  return (
    <section id="jak-to-dziala" ref={root} className="relative scroll-mt-20 overflow-hidden bg-navy py-24 text-ivory md:py-36">
      <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1.2px)] [background-size:24px_24px]" />
      <div className="relative container-x">
        <p className="eyebrow !text-ivory/60">
          <span className="text-yellow">●</span> {t.how.eyebrow}
        </p>
        <h2 className="mt-5 max-w-[15ch] font-display text-[clamp(2.4rem,5.8vw,5.2rem)] leading-[0.96] font-extrabold tracking-[-0.05em]">
          {t.how.title.split(' ').slice(0, 2).join(' ')}{' '}
          <span className="serif-accent font-normal text-yellow">{t.how.title.split(' ').slice(2).join(' ')}</span>
        </h2>

        <div className="hw-steps relative mt-16 md:mt-24">
          {/* desktop path */}
          <svg aria-hidden viewBox="0 0 1200 160" preserveAspectRatio="none" className="absolute top-[7.5rem] left-0 hidden h-40 w-full lg:block">
            <path className="hw-path" d="M60 80 C 260 -20, 340 180, 600 80 S 960 -10, 1140 80" fill="none" stroke="#FFD978" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          {/* mobile path */}
          <svg aria-hidden viewBox="0 0 40 1000" preserveAspectRatio="none" className="absolute top-0 bottom-0 left-3 h-full w-10 lg:hidden">
            <path className="hw-path" d="M20 0 C 40 160, 0 330, 20 500 S 40 840, 20 1000" fill="none" stroke="#FFD978" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          <ol className="relative grid gap-16 pl-14 lg:grid-cols-3 lg:gap-10 lg:pl-0">
            {/* 01 */}
            <li className="hw-1">
              <div className="relative mx-auto flex h-64 items-center justify-center [perspective:900px] lg:mx-0">
                {PRODUCT_LOOKS.slice(0, 3).map((l, i) => (
                  <div key={l.slug} className="cv absolute" style={{ transform: `translateX(${(i - 1) * 54}px) rotate(${(i - 1) * 8}deg) translateY(${Math.abs(i - 1) * 10}px)`, zIndex: i === 1 ? 3 : 1 }}>
                    <div style={{ transform: 'rotateY(-14deg)', transformStyle: 'preserve-3d' }}>
                      <Book look={l} style={{ ['--w' as string]: '7.4rem', ['--h' as string]: '9.8rem', ['--d' as string]: '1rem' }} />
                    </div>
                  </div>
                ))}
                <span className="hw-badge absolute top-4 right-[18%] z-10 grid size-12 place-items-center rounded-full bg-yellow font-display text-lg font-extrabold text-navy shadow-card lg:right-[8%]">
                  ✓
                </span>
              </div>
              <Copy no={s[0].no} title={s[0].title} body={s[0].body} />
            </li>

            {/* 02 */}
            <li className="hw-2">
              <div className="relative mx-auto flex h-64 items-end justify-center pb-6 lg:mx-0">
                <div className="doc absolute top-6 left-1/2 -ml-11 h-28 w-22 rounded-lg bg-paper p-3 shadow-object">
                  <span className="block rounded bg-blue px-1.5 py-0.5 text-center font-display text-[0.6rem] font-extrabold text-white">PDF</span>
                  <span className="mt-2 block h-1 rounded bg-navy/15" />
                  <span className="mt-1.5 block h-1 w-3/4 rounded bg-navy/15" />
                  <span className="mt-1.5 block h-1 w-5/6 rounded bg-navy/15" />
                </div>
                <div className="relative w-[15rem] rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-blue">
                      <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
                        <path d="M10 3v10m-4-4 4 4 4-4M4 16h12" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">materials.pdf</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="bar h-full origin-left rounded-full bg-yellow" />
                      </div>
                    </div>
                  </div>
                  <p className="done mt-3 text-right text-xs font-semibold text-yellow">✓ {t.how.ready}</p>
                </div>
              </div>
              <Copy no={s[1].no} title={s[1].title} body={s[1].body} />
            </li>

            {/* 03 */}
            <li className="hw-3">
              <div className="relative mx-auto flex h-64 items-center justify-center [perspective:1000px] lg:mx-0">
                <div className="preserve-3d relative h-40 w-64 [transform:rotateX(18deg)]">
                  <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-lg bg-paper p-4 ruled">
                    {[70, 90, 55, 80].map((w, i) => (
                      <span key={i} className="line mt-2.5 block h-1.5 origin-left rounded bg-blue/40" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-lg bg-paper p-4 ruled">
                    <p className="serif-accent text-sm text-blue">Unit 2</p>
                    {[85, 60, 75].map((w, i) => (
                      <span key={i} className="line mt-2.5 block h-1.5 origin-left rounded bg-navy/25" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <div className="cover preserve-3d absolute inset-y-0 right-0 w-1/2 origin-left">
                    <div className="backface-hidden absolute inset-0 rounded-r-lg bg-blue">
                      <div className="absolute inset-2 rounded-md border-2 border-dashed border-white/50" />
                    </div>
                    <div className="backface-hidden absolute inset-0 rounded-l-lg bg-cream [transform:rotateY(180deg)]" />
                  </div>
                </div>
              </div>
              <Copy no={s[2].no} title={s[2].title} body={s[2].body} />
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}

function Copy({ no, title, body }: { no: string; title: string; body: string }) {
  return (
    <div className="hw-copy relative mt-6">
      <span className="absolute top-1 -left-14 grid size-8 place-items-center rounded-full bg-yellow font-display text-xs font-extrabold text-navy lg:static lg:mb-4 lg:inline-grid">
        {no}
      </span>
      <h3 className="font-display text-[2.2rem] font-extrabold tracking-[-0.04em]">{title}</h3>
      <p className="mt-2 max-w-xs leading-relaxed text-ivory/70">{body}</p>
    </div>
  )
}
