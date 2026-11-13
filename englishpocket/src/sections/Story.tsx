import { Tidy } from '../components/Tidy'
import { useRef } from 'react'
import { LogoMark } from '../components/Logo'
import { WordCard } from '../components/WordCard'
import { useI18n } from '../i18n/I18n'
import { gsap, prefersReduced, useGSAP } from '../lib/gsap'

const AREAS = [
  { en: 'present perfect', pl: 'czas present perfect', tone: 'navy' as const, x: -0.34, y: -0.2, z: 120, r: -12 },
  { en: 'curious', pl: 'ciekawy', tone: 'lavender' as const, x: 0.33, y: -0.24, z: 60, r: 9 },
  { en: 'E8 ready', pl: 'gotowy na egzamin', tone: 'yellow' as const, x: -0.38, y: 0.2, z: -40, r: 7 },
  { en: 'deadline', pl: 'termin', tone: 'blue' as const, x: 0.36, y: 0.18, z: 160, r: -8 },
  { en: 'small talk', pl: 'luźna rozmowa', tone: 'ivory' as const, x: 0.02, y: 0.33, z: 20, r: 3 },
]

/**
 * Scroll-driven story: one flashcard → flip → many cards → back into the pocket notebook.
 * A single pinned scene with a scrubbed (fully reversible) timeline. With reduced
 * motion the four scenes are shown as a static sequence instead.
 */
export function Story() {
  const { t } = useI18n()
  const root = useRef<HTMLElement>(null)
  const heads = [t.story.s1, t.story.s2, t.story.s3, t.story.s4]

  useGSAP(
    () => {
      if (prefersReduced()) return
      const q = gsap.utils.selector(root)
      const stage = q<HTMLElement>('.st-stage')[0]
      const W = () => Math.min(stage.clientWidth, 1100)
      const H = () => stage.clientHeight
      const mobile = window.matchMedia('(max-width: 767px)').matches

      gsap.set(q('.st-area'), { xPercent: -50, yPercent: -50, opacity: 0, z: -700, scale: 0.6 })
      gsap.set(q('.st-head:not(:first-child)'), { yPercent: 60, opacity: 0 })
      gsap.set(q('.st-pocket'), { yPercent: 60, opacity: 0, scale: 0.7, xPercent: -50 })

      const tl = gsap.timeline({
        defaults: { ease: 'power2.inOut', duration: 1 },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: mobile ? '+=260%' : '+=330%',
          pin: q('.st-pin')[0],
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const i = Math.min(3, Math.floor(self.progress * 4))
            q('.st-dot').forEach((d, j) => d.toggleAttribute('data-on', j <= i))
          },
        },
      })

      const swapHead = (from: number, to: number, at: number) => {
        tl.to(q('.st-head')[from], { yPercent: -60, opacity: 0, duration: 0.5, ease: 'power2.in' }, at)
        tl.to(q('.st-head')[to], { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, at + 0.35)
      }

      // Scene 1 — the card turns slowly in 3D
      tl.fromTo(q('.st-card'), { rotateY: -28, rotateX: 10 }, { rotateY: 12, rotateX: -4, duration: 1.2, ease: 'none' }, 0)

      // Scene 2 — flip + more cards appear from the background
      swapHead(0, 1, 1.0)
      tl.to(q('.st-card'), { rotateY: 180, rotateX: 0, duration: 1.1 }, 1.1)
      tl.to(q('.st-area'), { opacity: 0.55, z: -380, scale: 0.75, x: (i) => AREAS[i].x * W() * 0.45, y: (i) => AREAS[i].y * H() * 0.35, stagger: 0.05, duration: 1 }, 1.4)

      // Scene 3 — the cards spread into a 3D composition
      swapHead(1, 2, 2.4)
      tl.to(q('.st-card'), { scale: mobile ? 0.62 : 0.88, duration: 1 }, 2.5)
      tl.to(
        q('.st-area'),
        {
          opacity: 1,
          scale: mobile ? 0.7 : 1,
          z: (i) => (mobile ? AREAS[i].z * 0.4 : AREAS[i].z),
          x: (i) => AREAS[i].x * W() * (mobile ? 0.72 : 1),
          y: (i) => AREAS[i].y * H() * (mobile ? 0.8 : 1),
          rotate: (i) => AREAS[i].r,
          stagger: 0.04,
          duration: 1.2,
        },
        2.5,
      )
      tl.to(q('.st-orbit'), { rotateY: 14, rotateX: -6, duration: 1.4, ease: 'none' }, 2.6)

      // Scene 4 — everything goes back into the pocket notebook
      swapHead(2, 3, 4.0)
      tl.to(q('.st-pocket'), { yPercent: 0, opacity: 1, scale: 1, duration: 0.8 }, 4.0)
      tl.to(q('.st-orbit'), { rotateY: 0, rotateX: 0, duration: 0.8 }, 4.1)
      tl.to(
        q('.st-area, .st-card-wrap'),
        { x: 0, y: () => H() * 0.3, z: 0, rotate: 0, scale: 0.18, duration: 1.1, stagger: 0.06, ease: 'power3.in' },
        4.2,
      )
      tl.to(q('.st-area, .st-card-wrap'), { opacity: 0, duration: 0.2, stagger: 0.06 }, 5.1)
      tl.to(q('.st-pocket-glow'), { opacity: 1, scale: 1.25, duration: 0.5 }, 5.3)
      tl.to(q('.st-pocket-count'), { textContent: 6, snap: { textContent: 1 }, duration: 0.6, ease: 'none' }, 4.9)
      tl.to({}, { duration: 0.5 })
    },
    { scope: root, dependencies: [] },
  )

  return (
    <section id="historia" ref={root} aria-label={t.story.label} className="relative bg-ivory">
      <div className="st-pin relative h-[100svh] overflow-hidden motion-reduce:h-auto">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(220_213_255/0.55),transparent_65%)]" />

        {/* Headlines */}
        <div className="relative z-10 container-x pt-28 text-center md:pt-32 motion-reduce:pb-10">
          <p className="eyebrow">{t.story.label}</p>
          <div className="relative mt-4 grid motion-reduce:gap-6">
            {heads.map((h, i) => (
              <h2
                key={i}
                className="st-head motion-safe:col-start-1 motion-safe:row-start-1 mx-auto max-w-[16ch] font-display text-[clamp(2.1rem,5.4vw,4.8rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-navy"
              >
                <Tidy>{h}</Tidy>
              </h2>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div aria-hidden className="st-stage absolute inset-x-0 top-[34%] bottom-0 [perspective:1400px] motion-reduce:relative motion-reduce:h-[26rem]">
          <div className="st-orbit preserve-3d absolute inset-0">
            {AREAS.map((a, i) => (
              <div key={a.en} className="st-area absolute top-1/2 left-1/2 motion-reduce:hidden">
                <WordCard en={a.en} pl={a.pl} tone={a.tone} tag={t.story.areas[i]} className="h-[7rem] w-[11rem] text-[0.95rem] md:h-[8.5rem] md:w-[13.5rem] md:text-[1.1rem]" />
              </div>
            ))}

            <div className="st-card-wrap absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="st-card preserve-3d relative motion-reduce:[transform:rotateY(180deg)] h-[11rem] w-[17rem] md:h-[15rem] md:w-[24rem]">
                {/* front */}
                <div className="backface-hidden shadow-object absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[22px] bg-navy p-6 text-ivory md:p-8">
                  <div className="absolute inset-3 rounded-[16px] border-2 border-dashed border-white/20" />
                  <div className="flex items-center justify-between">
                    <LogoMark className="h-9 w-auto" />
                    <span className="text-[0.65rem] font-semibold tracking-[0.2em] text-ivory/60 uppercase">flashcard · 01</span>
                  </div>
                  <p className="serif-accent text-[3.4rem] leading-none text-yellow md:text-[4.6rem]">Aa?</p>
                </div>
                {/* back */}
                <div className="backface-hidden ruled shadow-object absolute inset-0 flex flex-col justify-between rounded-[22px] bg-paper p-6 text-navy [transform:rotateY(180deg)] md:p-8">
                  <span className="absolute inset-x-0 top-0 h-2 rounded-t-[22px] bg-blue" />
                  <div className="flex items-center justify-between text-[0.65rem] font-semibold tracking-[0.2em] text-muted uppercase">
                    <span>noun</span>
                    <span>/ˈfriːdəm/</span>
                  </div>
                  <div>
                    <p className="font-display text-[2.6rem] leading-none font-extrabold tracking-[-0.04em] md:text-[3.6rem]">freedom</p>
                    <p className="serif-accent mt-2 text-2xl text-blue md:text-3xl">wolność</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pocket notebook */}
          <div className="st-pocket absolute bottom-[8%] left-1/2 md:bottom-[10%] motion-reduce:hidden">
            <div className="st-pocket-glow absolute inset-[-30%] rounded-full bg-yellow/60 opacity-0 blur-2xl" />
            <div className="relative h-24 w-36 md:h-28 md:w-44">
              <div className="absolute inset-x-3 -top-3 h-8 rounded-t-md bg-paper ruled shadow-card" />
              <div className="absolute inset-0 rounded-b-[26px] rounded-t-[10px] bg-blue shadow-object">
                <div className="absolute inset-2.5 rounded-b-[20px] rounded-t-[6px] border-2 border-dashed border-white/55" />
                <span className="absolute right-3 bottom-2.5 font-display text-xs font-bold text-white/90">
                  +<span className="st-pocket-count">0</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* progress */}
        <ol aria-hidden className="absolute top-1/2 right-[clamp(1rem,3vw,2.5rem)] hidden -translate-y-1/2 flex-col gap-3 md:flex motion-reduce:hidden">
          {heads.map((_, i) => (
            <li key={i} className="st-dot flex items-center gap-2 font-display text-xs font-bold text-navy/25 transition-colors duration-500 data-[on]:text-navy">
              0{i + 1}
              <span className="h-px w-5 bg-current" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
