import { useRef, type CSSProperties } from 'react'
import { PROJECTS, type Project } from '../data/site'
import { Reveal, SplitText } from '../components/Reveal'
import { Arrow, MagneticLink } from '../components/Magnetic'
import { useInView } from '../hooks/useInView'
import { useFinePointer, useReducedMotion } from '../hooks/useMedia'

// Rendered widths: mockup ≈ 8/12 of the container on desktop, full width on phones; the phone is 24% of it.
const DESKTOP_SIZES = '(min-width: 1440px) 860px, (min-width: 768px) 60vw, 92vw'
const PHONE_SIZES = '(min-width: 1440px) 210px, (min-width: 768px) 15vw, 22vw'
const srcset = (base: string, kind: 'desktop' | 'mobile', widths: number[], ext: 'avif' | 'webp') =>
  widths.map((w) => `${base}-${kind}-${w}.${ext} ${w}w`).join(', ')

export function Work() {
  return (
    <section id="realizacje" aria-labelledby="work-title" className="relative py-28 md:py-44">
      <div className="container-x">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <Reveal as="p" className="eyebrow mb-6">
              <span className="text-lime">01</span> — Realizacje
            </Reveal>
            <SplitText
              id="work-title"
              text={['Nie tylko projektujemy.', 'Tworzymy wrażenie.']}
              className="text-[clamp(2.5rem,7vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]"
              lineClassName="last:text-mist"
            />
          </div>
          <Reveal className="md:col-span-4 md:pb-3" delay={200}>
            <p className="text-lg leading-relaxed text-mist">
              Każdy projekt to inna historia, inne potrzeby i jeden cel — wyróżnić Twój biznes w internecie.
            </p>
          </Reveal>
        </div>

        <Reveal
          className="mt-12 flex items-start gap-3 rounded-2xl border border-dashed border-line px-5 py-4 text-sm text-mist md:mt-16 md:items-center"
          delay={100}
        >
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-lime md:mt-0" />
          <p>
            <strong className="font-medium text-paper">Projekty demonstracyjne.</strong> Poniższe strony to koncepcje
            przygotowane przez Stronivo, aby pokazać nasze podejście do projektowania — nie są to realizacje dla klientów.
          </p>
        </Reveal>

        <ol className="mt-20 flex flex-col gap-28 md:mt-28 md:gap-44">
          {PROJECTS.map((p, i) => (
            <ProjectRow key={p.slug} project={p} index={i} />
          ))}
        </ol>

        <NextProject />
      </div>
    </section>
  )
}

function ProjectRow({ project: p, index }: { project: Project; index: number }) {
  const flip = index % 2 === 1
  const stage = useRef<HTMLDivElement>(null)
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const [imgRef, imgIn] = useInView<HTMLDivElement>({ threshold: 0.2 })

  const onMove = (e: React.PointerEvent) => {
    if (!fine || reduced || !stage.current) return
    const r = stage.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    stage.current.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`)
    stage.current.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`)
  }
  const onLeave = () => {
    stage.current?.style.setProperty('--rx', '0deg')
    stage.current?.style.setProperty('--ry', '0deg')
  }

  const titleId = `project-${p.slug}`

  return (
    <li className="grid items-center gap-10 md:grid-cols-12 md:gap-8" aria-labelledby={titleId}>
      {/* Mockups */}
      <div className={`md:col-span-8 ${flip ? 'md:order-2' : ''}`}>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="view"
          data-cursor-label="Zobacz"
          className="group/m block [perspective:1600px]"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
        >
          <div
            ref={stage}
            className="relative pb-[9%] transition-transform duration-700 ease-out-expo [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
          >
            {/* Desktop display */}
            <div ref={imgRef}>
            <div className={`img-reveal ${imgIn ? 'is-in' : ''} relative`}>
              <div className="img-reveal-inner overflow-hidden rounded-[18px] border border-line bg-surface p-[1.2%] shadow-[0_50px_120px_-40px_rgb(0_0_0/0.9)]">
                <div className="flex items-center gap-2 px-2 pb-2.5 pt-1 md:px-3 md:pb-3">
                  <span className="flex gap-1.5" aria-hidden>
                    <i className="size-2 rounded-full bg-[#3a414c] md:size-2.5" />
                    <i className="size-2 rounded-full bg-[#3a414c] md:size-2.5" />
                    <i className="size-2 rounded-full bg-[#3a414c] md:size-2.5" />
                  </span>
                  <span className="mx-auto flex max-w-[60%] items-center gap-2 truncate rounded-full bg-ink/70 px-3 py-1 text-[0.65rem] text-mist md:text-xs">
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-lime" />
                    {p.domain}
                  </span>
                </div>
                <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-ink">
                  <picture>
                    <source type="image/avif" srcSet={srcset(p.image, 'desktop', [900, 1600], 'avif')} sizes={DESKTOP_SIZES} />
                    <source type="image/webp" srcSet={srcset(p.image, 'desktop', [900, 1600], 'webp')} sizes={DESKTOP_SIZES} />
                    <img
                      src={`${p.image}-desktop-900.webp`}
                      width={1600}
                      height={1000}
                      loading="lazy"
                      decoding="async"
                      alt={`Projekt demonstracyjny strony internetowej ${p.subject} — widok na komputerze`}
                      className="h-full w-full object-cover object-top transition-transform duration-[1200ms] ease-out-expo group-hover/m:scale-[1.035]"
                    />
                  </picture>
                </div>
              </div>
            </div>
            </div>

            {/* Phone */}
            <div
              className={`absolute bottom-0 w-[24%] transition-transform duration-700 ease-out-expo [transform:translateZ(60px)] group-hover/m:[transform:translateZ(90px)_translateY(-14px)] ${
                flip ? 'left-0 md:left-[-3%]' : 'right-0 md:right-[-3%]'
              }`}
            >
              <Reveal delay={450}>
                <div className="rounded-[1.6rem] border border-[#3a414c] bg-[#0b0d11] p-[5%] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.95)] md:rounded-[2.2rem]">
                  <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.15rem] bg-ink md:rounded-[1.7rem]">
                    <picture>
                      <source type="image/avif" srcSet={srcset(p.image, 'mobile', [200, 400, 600], 'avif')} sizes={PHONE_SIZES} />
                      <source type="image/webp" srcSet={srcset(p.image, 'mobile', [200, 400, 600], 'webp')} sizes={PHONE_SIZES} />
                      <img
                        src={`${p.image}-mobile-400.webp`}
                        width={600}
                        height={1298}
                        loading="lazy"
                        decoding="async"
                        alt={`Projekt demonstracyjny strony internetowej ${p.subject} — widok na telefonie`}
                        className="h-full w-full object-cover object-top"
                      />
                    </picture>
                    <span aria-hidden className="absolute left-1/2 top-[2.2%] h-[3.2%] w-[32%] -translate-x-1/2 rounded-full bg-black" />
                    <span className="sr-only"> — otwiera się w nowej karcie</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </a>
      </div>

      {/* Info */}
      <div className={`md:col-span-4 ${flip ? 'md:order-1 md:pr-14' : 'md:pl-14'}`}>
        <Reveal>
          <div className="flex items-center gap-4 text-sm text-mist">
            <span className="font-display text-paper">{String(index + 1).padStart(2, '0')}</span>
            <span aria-hidden className="h-px w-10 bg-line" />
            <span>{p.industry}</span>
          </div>
          <h3 id={titleId} className="mt-6 text-[clamp(2.2rem,4.6vw,4rem)] font-semibold leading-none tracking-[-0.04em]">
            {p.name}
          </h3>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-mist">
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: p.accent } as CSSProperties} />
            Projekt demonstracyjny
          </p>
          <p className="mt-6 leading-relaxed text-mist">{p.summary}</p>
          <div className="mt-8">
            <MagneticLink href={p.url} target="_blank" rel="noopener noreferrer" variant="ghost">
              Zobacz projekt
              <span className="sr-only"> {p.name} (otwiera się w nowej karcie)</span>
            </MagneticLink>
          </div>
        </Reveal>
      </div>
    </li>
  )
}

/** An empty, waiting port — the honest alternative to inventing more projects. */
function NextProject() {
  return (
    <Reveal className="mt-28 md:mt-44">
      <a
        href="#kontakt"
        data-cursor="link"
        className="group/btn group/n relative flex flex-col gap-10 overflow-hidden rounded-[28px] border border-line p-8 transition-colors duration-500 hover:border-lime/60 md:flex-row md:items-center md:justify-between md:p-14"
      >
        <div>
          <p className="eyebrow">Wolny port</p>
          <p className="mt-4 font-display text-[clamp(2rem,4.4vw,3.75rem)] font-semibold leading-[1] tracking-[-0.04em]">
            Tu może pojawić się
            <br />
            <span className="text-mist transition-colors duration-500 group-hover/n:text-lime">Twój projekt.</span>
          </p>
        </div>
        <div className="flex items-center gap-6">
          <svg aria-hidden viewBox="0 0 220 80" className="h-16 w-44 md:h-20 md:w-56">
            <path d="M0 40 H80" stroke="#2f353f" strokeWidth="8" strokeLinecap="round" />
            <g className="transition-transform duration-700 ease-out-expo group-hover/n:translate-x-[38px]">
              <rect x="70" y="26" width="42" height="28" rx="7" fill="#353b45" />
              <rect x="112" y="32" width="18" height="16" rx="3" fill="#b6bcc5" />
              <path d="M0 40 H72" stroke="#2a3039" strokeWidth="7" strokeLinecap="round" />
            </g>
            <rect x="170" y="14" width="48" height="52" rx="12" fill="#252a32" />
            <rect x="164" y="28" width="12" height="24" rx="3" fill="#050608" />
            <rect x="196" y="24" width="4" height="32" rx="2" className="fill-[#3a414c] transition-colors duration-500 group-hover/n:fill-lime" />
          </svg>
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-lime text-ink">
            <Arrow />
          </span>
        </div>
      </a>
    </Reveal>
  )
}
