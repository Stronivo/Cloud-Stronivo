import { Tidy } from '../components/Tidy'
import { useRef } from 'react'
import { LogoMark } from '../components/Logo'
import { MagneticLink } from '../components/Magnetic'
import { WordCard, type WordCardProps } from '../components/WordCard'
import { SLOGAN } from '../i18n/dict'
import { useI18n } from '../i18n/I18n'
import { gsap, prefersReduced, useGSAP } from '../lib/gsap'

type HeroCard = Omit<WordCardProps, 'className' | 'style'> & { pos: string; rot: number; depth: number; mobile?: boolean }

/* Final resting places around the notebook (relative to the visual column). */
const CARDS: HeroCard[] = [
  { en: 'freedom', pl: 'wolność', tag: 'noun', tone: 'lavender', pos: 'left-[-6%] top-[2%]', rot: -11, depth: 1.2, mobile: true },
  { en: 'at your own pace', pl: 'we własnym tempie', tag: 'phrase', tone: 'yellow', pos: 'right-[-4%] top-[-4%]', rot: 8, depth: 0.7 },
  { en: 'confident', pl: 'pewny siebie', tag: 'adjective', tone: 'blue', pos: 'right-[-8%] top-[52%]', rot: 12, depth: 1.5, mobile: true },
  { en: 'pocket', pl: 'kieszeń', tag: 'noun', tone: 'navy', pos: 'left-[-10%] bottom-[4%]', rot: 7, depth: 1 },
  { en: 'to improve', pl: 'poprawić', tag: 'verb', tone: 'ivory', pos: 'left-[38%] bottom-[-8%]', rot: -5, depth: 0.5 },
]

const FLOATING_WORDS = ['vocabulary', 'grammar', 'fluent', 'listen', 'practice', 'curious', 'notebook', 'speak', 'progress', 'phrase', 'confidence', 'explore']

export function Hero() {
  const { t, lang } = useI18n()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const q = gsap.utils.selector(root)
      const reduced = prefersReduced()
      gsap.set(q('[data-intro]'), { visibility: 'visible' })
      if (reduced) {
        gsap.set(q('.nb-cover'), { rotateY: -168 })
        gsap.set(q('.nb'), { xPercent: 0 })
        return
      }

      const mobile = window.matchMedia('(max-width: 1023px)').matches
      const pageCenter = q('.nb-page')[0]?.getBoundingClientRect()
      const cards = q<HTMLElement>('.hero-card')

      // Where each card has to start so it appears to come out of the notebook pages.
      const offsets = cards.map((c) => {
        const r = c.getBoundingClientRect()
        if (!pageCenter) return { x: 0, y: 0 }
        return {
          x: pageCenter.left + pageCenter.width * 0.25 - (r.left + r.width / 2),
          y: pageCenter.top + pageCenter.height * 0.45 - (r.top + r.height / 2),
        }
      })

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
      tl.from(q('.hero-eyebrow'), { y: 16, opacity: 0, duration: 0.9 })
        // 1 — masked reveal
        .from(q('.hl-1 .mask-inner'), { yPercent: 110, duration: 1.2 }, 0.2)
        // 2 — slides into position
        .from(q('.hl-2 .mask-inner'), { xPercent: -14, opacity: 0, duration: 1.3, ease: 'power4.out' }, 0.55)
        // 3 — character by character
        .from(q('.hl-3 .ch'), { yPercent: 105, rotate: 8, opacity: 0, duration: 0.9, stagger: 0.035 }, 0.95)
        // 4 — highlight
        .from(q('.hl-3-underline path'), { strokeDashoffset: 420, duration: 1.1, ease: 'power3.inOut' }, 1.45)
        // 5 — notebook enters
        .from(q('.nb-stage'), { y: 120, rotateX: 40, rotateZ: -14, opacity: 0, duration: 1.6 }, 0.9)
        // 6 — notebook opens (and slides so the open spread stays centred)
        .to(q('.nb-cover'), { rotateY: -168, duration: 1.5, ease: 'power3.inOut' }, 2.05)
        .fromTo(q('.nb-left'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 2.75)
        .fromTo(q('.nb'), { xPercent: -25 }, { xPercent: 0, duration: 1.5, ease: 'power3.inOut' }, 2.05)
        .from(q('.nb-shine'), { opacity: 0, duration: 0.8 }, 2.6)
        // 7 — flashcards emerge from the pages
        .from(
          cards,
          {
            x: (i) => offsets[i].x,
            y: (i) => offsets[i].y,
            rotate: 0,
            scale: 0.25,
            opacity: 0,
            duration: 1.4,
            ease: 'expo.out',
            stagger: 0.09,
          },
          3.05,
        )
        // 9 — supporting text and CTAs
        .from(q('.hero-lead, .hero-cta > *, .hero-note'), { y: 26, opacity: 0, duration: 1, stagger: 0.08 }, 1.7)
        .from(q('.hero-words'), { opacity: 0, duration: 1.2 }, 2.4)
        .from(q('.hero-scroll'), { opacity: 0, y: -10, duration: 0.8 }, 3.2)

      // 8 — cards keep floating with depth
      cards.forEach((c, i) => {
        gsap.to(c.querySelector('.float'), {
          y: i % 2 ? 10 : -12,
          rotate: i % 2 ? 1.6 : -1.6,
          duration: 3 + i * 0.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 4 + i * 0.2,
        })
      })

      // Pointer parallax on desktop only
      if (!mobile && window.matchMedia('(hover: hover)').matches) {
        const layers = q<HTMLElement>('[data-depth]').map((el) => ({
          d: Number(el.dataset.depth),
          x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }),
        }))
        const rx = gsap.quickTo(q('.nb-stage'), 'rotateY', { duration: 1.4, ease: 'power3.out' })
        const ry = gsap.quickTo(q('.nb-stage'), 'rotateX', { duration: 1.4, ease: 'power3.out' })
        const onMove = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5
          const ny = e.clientY / window.innerHeight - 0.5
          layers.forEach((l) => {
            l.x(nx * 26 * l.d)
            l.y(ny * 20 * l.d)
          })
          rx(nx * 10)
          ry(-ny * 8)
        }
        window.addEventListener('pointermove', onMove)
        return () => window.removeEventListener('pointermove', onMove)
      }
    },
    { scope: root },
  )

  const line3 = SLOGAN[2]

  return (
    <section id="start" ref={root} className="relative isolate overflow-hidden pt-28 pb-16 md:pt-36 lg:min-h-[100svh] lg:pb-10">
      <div aria-hidden className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_70%_40%,#000_10%,transparent_75%)]" />
      <div aria-hidden className="absolute top-[12%] right-[-8%] -z-10 size-[42rem] rounded-full bg-lavender/60 blur-[120px]" />
      <div aria-hidden className="absolute bottom-[-10%] left-[30%] -z-10 size-[26rem] rounded-full bg-yellow/30 blur-[120px]" />

      <div className="container-x grid items-center gap-y-14 lg:grid-cols-12 lg:gap-x-8">
        {/* Copy */}
        <div className="relative z-10 lg:col-span-7">
          <p data-intro className="hero-eyebrow inline-flex items-center gap-2.5 rounded-full border border-navy/10 bg-white/60 px-4 py-2 text-[0.8rem] font-semibold text-navy backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-blue/50" />
              <span className="relative size-2 rounded-full bg-blue" />
            </span>
            {t.hero.eyebrow}
          </p>

          <h1
            lang="pl"
            className="mt-7 font-display text-[clamp(2.1rem,9vw,4.6rem)] leading-[0.95] font-extrabold tracking-[-0.045em] text-navy lg:text-[min(5.6vw,6.6rem)]"
            aria-label={SLOGAN.join(' ')}
          >
            <span aria-hidden className="hl-1 mask-line">
              <span data-intro className="mask-inner block"><Tidy>{SLOGAN[0]}</Tidy></span>
            </span>
            <span aria-hidden className="hl-2 mask-line">
              <span data-intro className="mask-inner serif-accent block pl-[0.04em] text-[1.06em] tracking-[-0.03em]">
                {SLOGAN[1]}
              </span>
            </span>
            <span aria-hidden className="hl-3 relative inline-block text-blue">
              <span className="mask-line inline-block">
                {[...line3].map((c, i) => (
                  <span key={i} data-intro className={`ch inline-block will-change-transform ${c === '.' ? 'ml-[-0.09em]' : ''}`}>
                    {c === ' ' ? ' ' : c}
                  </span>
                ))}
              </span>
              <svg data-intro className="hl-3-underline absolute -bottom-[0.12em] left-0 h-[0.22em] w-full overflow-visible" viewBox="0 0 400 20" preserveAspectRatio="none">
                <path d="M4 14 C 90 4, 200 4, 396 10" fill="none" stroke="#FFD978" strokeWidth="9" strokeLinecap="round" strokeDasharray="420" />
              </svg>
            </span>
          </h1>

          {lang === 'en' && (
            <p className="hero-note mt-5 text-sm font-medium text-muted italic">
              „{t.hero.sloganNote}”
            </p>
          )}

          <p data-intro className="hero-lead mt-8 max-w-[34rem] text-[1.05rem] leading-relaxed text-muted md:text-lg">
            {t.hero.lead}
          </p>
          <div className="hero-cta mt-9 flex flex-wrap items-center gap-3">
            <span data-intro>
              <MagneticLink href="#materialy">{t.hero.cta}</MagneticLink>
            </span>
            <span data-intro>
              <MagneticLink href="#jak-to-dziala" variant="ghost" arrow={false}>
                {t.hero.how}
              </MagneticLink>
            </span>
          </div>
        </div>

        {/* 3D notebook + flashcards */}
        <div className="relative mx-auto aspect-[1/0.92] w-full max-w-[34rem] [perspective:1600px] sm:max-w-[30rem] lg:col-span-5 lg:max-w-none" aria-hidden>
          <div data-intro data-depth="0.35" className="nb-stage preserve-3d absolute inset-0 flex items-center justify-center">
            <Notebook />
          </div>
          {CARDS.map((c) => (
            <div
              key={c.en}
              data-intro
              data-depth={c.depth}
              className={`hero-card absolute ${c.pos} ${c.mobile ? '' : 'max-sm:hidden'} z-[2]`}
              style={{ rotate: `${c.rot}deg`, zIndex: 2 + Math.round(c.depth * 2) }}
            >
              <div className="float">
                <WordCard {...c} className="h-[clamp(5.4rem,9vw,7.6rem)] w-[clamp(8.4rem,13.5vw,11.5rem)] text-[clamp(0.85rem,1.25vw,1.05rem)]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating English words band */}
      <div aria-hidden data-intro className="hero-words relative mt-16 overflow-hidden border-y border-navy/[0.07] py-4 lg:mt-14">
        <div className="flex w-max animate-[marquee_42s_linear_infinite] gap-10 font-display text-sm font-semibold text-navy/40 md:text-base">
          {[...FLOATING_WORDS, ...FLOATING_WORDS].map((w, i) => (
            <span key={i} className="flex items-center gap-10 whitespace-nowrap">
              <span className={i % 3 === 1 ? 'serif-accent text-[1.15em] text-blue/70' : ''}>{w}</span>
              <span className="size-1.5 rounded-full bg-yellow" />
            </span>
          ))}
        </div>
      </div>

    </section>
  )
}

function Notebook() {
  return (
    <div className="nb preserve-3d relative h-[clamp(13rem,23vw,21rem)] w-[clamp(20rem,36vw,33rem)] [transform:rotateX(14deg)_rotateZ(-4deg)]">
      {/* soft floor shadow */}
      <div className="absolute inset-x-[6%] -bottom-[14%] h-[18%] rounded-[50%] bg-navy/25 blur-2xl [transform:translateZ(-40px)]" />
      {/* left page (revealed when the cover opens) */}
      <div className="nb-left absolute top-0 left-0 h-full w-1/2 overflow-hidden rounded-l-[10px] bg-paper ruled shadow-object">
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-navy/15 to-transparent" />
      </div>
      {/* right page */}
      <div className="nb-page absolute top-0 right-0 h-full w-1/2 overflow-hidden rounded-r-[10px] bg-paper ruled shadow-object">
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-navy/15 to-transparent" />
        <div className="nb-shine absolute inset-0 bg-[radial-gradient(circle_at_40%_45%,rgb(255_217_120/0.45),transparent_60%)]" />
        <div className="space-y-[0.45em] p-[11%] pl-[16%] font-display text-[clamp(0.6rem,1vw,0.85rem)] text-navy">
          <p className="serif-accent text-[1.6em] text-blue">Unit 1</p>
          <p className="font-bold">learn → uczyć się</p>
          <p className="font-bold">grow → rosnąć</p>
          <p className="font-bold text-navy/55">explore → odkrywać</p>
          <span className="block h-[0.35em] w-3/4 rounded bg-navy/10" />
          <span className="block h-[0.35em] w-1/2 rounded bg-navy/10" />
        </div>
      </div>
      {/* cover — hinged on the spine */}
      <div className="nb-cover preserve-3d absolute top-0 right-0 h-full w-1/2 origin-left">
        <div className="backface-hidden absolute inset-0 overflow-hidden rounded-r-[12px] bg-blue shadow-object">
          <div className="absolute inset-[7%] rounded-[8px] border-2 border-dashed border-white/55" />
          <div className="absolute inset-y-0 left-0 w-3 bg-navy/25" />
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
            <LogoMark className="w-[34%] drop-shadow-lg" />
            <span className="font-display text-[clamp(0.7rem,1.1vw,0.95rem)] font-extrabold tracking-[0.18em] uppercase">My English</span>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgb(255_255_255/0.22),transparent_45%)]" />
        </div>
        <div className="backface-hidden absolute inset-0 rounded-l-[12px] bg-cream [transform:rotateY(180deg)]">
          <div className="absolute inset-[8%] rounded-[6px] border border-navy/10" />
          <p className="serif-accent absolute inset-x-0 top-[38%] text-center text-[clamp(0.9rem,1.5vw,1.3rem)] text-navy/70">
            Property of a<br />curious learner
          </p>
        </div>
      </div>
      {/* spine */}
      <div className="absolute top-0 left-1/2 h-full w-[3px] -translate-x-1/2 bg-navy/20" />
    </div>
  )
}
