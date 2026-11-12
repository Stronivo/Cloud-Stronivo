import { useCallback, useRef } from 'react'
import { Reveal, SplitText } from '../components/Reveal'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { useReducedMotion } from '../hooks/useMedia'

const TEXT =
  'W Stronivo wierzymy, że profesjonalna obecność w internecie nie musi być zarezerwowana dla największych firm. Tworzymy nowoczesne, przemyślane strony internetowe, które łączą estetykę z funkcjonalnością. Stawiamy na indywidualne podejście, kreatywność i rozwiązania dopasowane do potrzeb każdego biznesu.'

const HIGHLIGHT = new Set(['estetykę', 'funkcjonalnością.', 'indywidualne', 'kreatywność'])

const PRINCIPLES = [
  { k: 'Indywidualne podejście', v: 'Zaczynamy od Twojej firmy, nie od szablonu.' },
  { k: 'Estetyka + funkcja', v: 'Strona ma wyglądać świetnie i po prostu działać.' },
  { k: 'Dopasowanie', v: 'Rozwiązania skrojone pod potrzeby konkretnego biznesu.' },
]

export function About() {
  const para = useRef<HTMLParagraphElement>(null)
  const reduced = useReducedMotion()

  // Words light up as the paragraph is read through the viewport
  const onProgress = useCallback(
    (p: number) => {
      const words = para.current?.querySelectorAll<HTMLElement>('[data-w]')
      if (!words) return
      const n = words.length
      words.forEach((w, i) => {
        const lit = reduced || p * (n + 6) > i
        w.style.opacity = lit ? '1' : '0.22'
      })
    },
    [reduced],
  )
  useScrollProgress(para, onProgress, { start: 0.85, end: 0.55 })

  return (
    <section id="o-nas" aria-labelledby="about-title" className="relative overflow-hidden border-t border-line/60 py-28 md:py-44">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Reveal as="p" className="eyebrow mb-6">
            <span className="text-lime">05</span> — O Stronivo
          </Reveal>
          <SplitText
            id="about-title"
            text={['Małe studio.', 'Wielkie pomysły.']}
            className="text-[clamp(2.4rem,4.6vw,4.4rem)] font-semibold leading-[0.98] tracking-[-0.045em]"
            lineClassName="last:text-lime"
          />
        </div>

        <div className="lg:col-span-8">
          <p
            ref={para}
            className="font-display text-[clamp(1.45rem,2.8vw,2.6rem)] font-medium leading-[1.22] tracking-[-0.025em]"
          >
            {TEXT.split(' ').map((w, i) => (
              <span key={i}>
                <span data-w className={`transition-opacity duration-300 ${HIGHLIGHT.has(w) ? 'text-lime' : ''}`} style={{ opacity: 0.22 }}>
                  {w}
                </span>{' '}
              </span>
            ))}
          </p>

          <ul className="mt-16 grid gap-px overflow-hidden rounded-[22px] border border-line bg-line sm:grid-cols-3 md:mt-24">
            {PRINCIPLES.map((p, i) => (
              <Reveal as="li" key={p.k} delay={i * 100} className="bg-ink p-7 md:p-8">
                <p className="font-display text-sm text-lime">0{i + 1}</p>
                <p className="mt-6 font-display text-xl font-semibold tracking-tight">{p.k}</p>
                <p className="mt-2 text-mist">{p.v}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
