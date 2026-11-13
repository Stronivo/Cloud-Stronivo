import { useCallback, useRef, type CSSProperties } from 'react'
import { HeroCable } from '../components/cable/HeroCable'
import { MagneticLink } from '../components/Magnetic'
import { useReducedMotion } from '../hooks/useMedia'

const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

export function Hero({ onIntroDone }: { onIntroDone: () => void }) {
  const hero = useRef<HTMLElement>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const done = useCallback(() => onIntroDone(), [onIntroDone])

  const tail = 'Twoją firmę do internetu.'.split(' ')

  return (
    <section
      id="start"
      ref={hero}
      aria-labelledby="hero-title"
      className="group relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* technical grid — fades towards the edges */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,#252a32_1px,transparent_1px),linear-gradient(to_bottom,#252a32_1px,transparent_1px)] [background-size:96px_96px] [mask-image:radial-gradient(ellipse_70%_60%_at_60%_40%,#000_20%,transparent_75%)]"
      />

      <HeroCable heroRef={hero} anchorRef={anchor} reduced={reduced} onConnected={done} />

      <div className="container-x relative z-10 flex flex-1 flex-col justify-center pb-72 pt-28 md:pb-40 md:pt-40">
        <p className="eyebrow intro-fade mb-8 flex items-center gap-3 md:mb-10" style={delay(0)}>
          <span className="relative inline-flex size-2">
            <span className="absolute inset-0 rounded-full bg-lime blink" />
          </span>
          Tworzenie stron internetowych · Żory i Śląsk
        </p>

        <h1 id="hero-title" className="hero-title font-display text-paper">
          <span className="block text-[clamp(3.15rem,14.2vw,5rem)] font-bold leading-[0.92] tracking-[-0.055em] md:text-[clamp(5rem,10.6vw,12.25rem)]">
            <span ref={anchor} className="split-word !pb-[0.16em] !-mb-[0.16em]">
              <span style={{ '--i': 0 } as CSSProperties}>
                Podłączamy
              </span>
            </span>
          </span>
          {' '}
          <span className="mt-3 block text-[clamp(1.6rem,7vw,2.4rem)] font-medium leading-[1.02] tracking-[-0.035em] md:mt-5 md:text-[clamp(2.4rem,4.4vw,4.6rem)]">
            {tail.map((w, i) => (
              <span key={w}>
                <span className="split-word">
                  <span style={{ '--i': i + 2 } as CSSProperties}>
                    {i === tail.length - 1 ? (
                      <>
                        {w.slice(0, -1)}
                        <span className="text-lime">.</span>
                      </>
                    ) : (
                      w
                    )}
                  </span>
                </span>
                {i < tail.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        </h1>

        <p
          className="intro-fade mt-8 max-w-[34rem] text-base leading-relaxed text-mist md:mt-10 md:text-lg"
          style={delay(380)}
        >
          Projektujemy nowoczesne strony internetowe, które przyciągają uwagę, budują zaufanie i pomagają zdobywać
          klientów.
        </p>

        <div className="intro-fade mt-9 flex flex-wrap gap-3 md:mt-11 md:gap-4" style={delay(520)}>
          <MagneticLink href="#realizacje">Zobacz realizacje</MagneticLink>
          <MagneticLink href="#kontakt" variant="ghost">
            Porozmawiajmy
          </MagneticLink>
        </div>
      </div>

      <div className="intro-fade container-x absolute inset-x-0 bottom-6 z-10 hidden flex-col items-end gap-4 md:flex" style={delay(800)}>
        <a href="#realizacje" className="group/s flex items-center gap-4 text-sm text-mist transition-colors hover:text-paper">
          <span aria-hidden className="relative h-12 w-px overflow-hidden bg-line">
            <span className="absolute inset-x-0 top-0 h-1/2 bg-lime motion-safe:animate-[scrollcue_2.2s_ease-in-out_infinite]" />
          </span>
          Przewiń, aby zobaczyć więcej
        </a>
      </div>
    </section>
  )
}
