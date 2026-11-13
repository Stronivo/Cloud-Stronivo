import { Tidy } from '../components/Tidy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DEMO_WORDS, POCKET_DICTIONARY } from '../data/vocab'
import { useI18n } from '../i18n/I18n'
import { gsap, prefersReduced, useGSAP } from '../lib/gsap'

export function Demo() {
  const { t } = useI18n()
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReduced()) return
      const q = gsap.utils.selector(root)
      gsap.from(q('.dm-in'), { y: 50, opacity: 0, stagger: 0.1, duration: 1.1, scrollTrigger: { trigger: root.current, start: 'top 75%' } })
    },
    { scope: root },
  )

  return (
    <section id="demo" ref={root} className="relative overflow-hidden py-24 md:py-36">
      <div aria-hidden className="dot-grid absolute inset-0 -z-10 opacity-70" />
      <div className="container-x">
        <div className="dm-in max-w-3xl">
          <p className="eyebrow">
            <span className="text-blue">●</span> {t.demo.eyebrow}
          </p>
          <h2 className="mt-5 font-display text-[clamp(2.3rem,5vw,4.4rem)] leading-[0.98] font-extrabold tracking-[-0.045em]"><Tidy>{t.demo.title}</Tidy></h2>
          <p className="mt-5 max-w-xl text-lg text-muted">{t.demo.lead}</p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          <div className="dm-in lg:col-span-7">
            <Flashcards />
          </div>
          <div className="dm-in lg:col-span-5">
            <Translator />
          </div>
        </div>
      </div>
    </section>
  )
}

function Flashcards() {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Record<number, boolean>>({})
  const [dir, setDir] = useState(1)
  const n = DEMO_WORDS.length
  const w = DEMO_WORDS[i]
  const done = Object.keys(known).length === n
  const knownCount = Object.values(known).filter(Boolean).length
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  const go = (d: number) => {
    setDir(d)
    setFlipped(false)
    setI((x) => (x + d + n) % n)
  }
  const mark = (k: boolean) => {
    setKnown((m) => ({ ...m, [i]: k }))
    go(1)
  }
  const speak = () => {
    if (!canSpeak) return
    const u = new SpeechSynthesisUtterance(w.en.replace(/^to /, ''))
    u.lang = 'en-GB'
    u.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="flex h-full flex-col rounded-[32px] border border-navy/[0.07] bg-white/70 p-5 backdrop-blur sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-sm font-bold text-navy" aria-live="polite">
          {t.demo.progress(i + 1, n)}
        </p>
        <div className="flex gap-1.5" aria-hidden>
          {DEMO_WORDS.map((_, j) => (
            <span
              key={j}
              className={`h-1.5 rounded-full transition-all duration-500 ${j === i ? 'w-6 bg-blue' : known[j] === true ? 'w-1.5 bg-[#2FB5A8]' : known[j] === false ? 'w-1.5 bg-yellow' : 'w-1.5 bg-navy/15'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative mt-6 [perspective:1400px]">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
          aria-label={`${t.demo.label}: ${w.en}. ${flipped ? `${t.demo.translation}: ${w.pl}. ${t.demo.flipBack}` : t.demo.flip}`}
          aria-pressed={flipped}
          className="group block h-[17rem] w-full rounded-[26px] sm:h-[19rem]"
        >
          <span
            key={i}
            className="dm-card preserve-3d relative block h-full w-full transition-transform duration-[900ms] ease-out-expo"
            style={{ transform: flipped ? 'rotateY(180deg)' : 'none', animation: `${dir > 0 ? 'dmInR' : 'dmInL'} .7s cubic-bezier(.16,1,.3,1)` }}
          >
            {/* front */}
            <span className="backface-hidden ruled shadow-object absolute inset-0 flex flex-col justify-between rounded-[26px] bg-paper p-6 text-left sm:p-8">
              <span className="absolute inset-x-0 top-0 h-2 rounded-t-[26px] bg-blue" />
              <span className="flex items-center justify-between text-xs font-semibold tracking-[0.18em] text-muted uppercase">
                <span>English</span>
                <span>{w.ipa}</span>
              </span>
              <span lang="en" className="font-display text-[clamp(2.6rem,6vw,4.4rem)] leading-none font-extrabold tracking-[-0.045em] text-navy">
                {w.en}
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-blue transition-transform duration-500 group-hover:translate-x-1">↻ {t.demo.flip}</span>
            </span>
            {/* back */}
            <span className="backface-hidden shadow-object absolute inset-0 flex flex-col justify-between rounded-[26px] bg-navy p-6 text-left text-ivory [transform:rotateY(180deg)] sm:p-8">
              <span className="text-xs font-semibold tracking-[0.18em] text-ivory/50 uppercase">{t.demo.translation}</span>
              <span>
                <span lang="pl" className="serif-accent block text-[clamp(2.4rem,5.4vw,4rem)] leading-none text-yellow">
                  {w.pl}
                </span>
                <span lang="en" className="mt-5 block text-base text-ivory/90 sm:text-lg">
                  <span className="mr-2 text-xs font-semibold tracking-[0.18em] text-ivory/50 uppercase">{t.demo.example}</span>
                  {w.example}
                </span>
                <span lang="pl" className="mt-1 block text-sm text-ivory/55">
                  {w.examplePl}
                </span>
              </span>
            </span>
          </span>
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => go(-1)} aria-label={t.demo.prev} className="grid size-12 place-items-center rounded-full border-[1.5px] border-navy/15 text-navy transition hover:border-navy">
            ←
          </button>
          <button type="button" onClick={() => go(1)} aria-label={t.demo.next} className="grid size-12 place-items-center rounded-full border-[1.5px] border-navy/15 text-navy transition hover:border-navy">
            →
          </button>
          {canSpeak && (
            <button type="button" onClick={speak} aria-label={t.demo.listen} title={t.demo.listen} className="grid size-12 place-items-center rounded-full border-[1.5px] border-navy/15 text-navy transition hover:border-navy">
              <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
                <path d="M3 8v4h3l4 3V5L6 8zm10-1a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => mark(false)} className="min-h-12 rounded-full bg-yellow/60 px-5 font-display text-sm font-bold text-navy transition hover:bg-yellow">
            {t.demo.learning}
          </button>
          <button type="button" onClick={() => mark(true)} className="min-h-12 rounded-full bg-navy px-5 font-display text-sm font-bold text-ivory transition hover:bg-navy-2">
            ✓ {t.demo.known}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
        <span aria-live="polite">
          {done ? (
            <>
              <strong className="text-navy">{t.demo.score(knownCount, n)}</strong> ·{' '}
              <button type="button" className="font-semibold text-blue underline" onClick={() => (setKnown({}), setI(0), setFlipped(false))}>
                {t.demo.restart}
              </button>
            </>
          ) : (
            <span className="hidden sm:inline">{t.demo.hint}</span>
          )}
        </span>
        <span>{t.demo.disclaimer}</span>
      </div>
    </div>
  )
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/^to /, '')
    .trim()

function Translator() {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [dir, setDir] = useState<'pl-en' | 'en-pl'>('pl-en')
  const inputRef = useRef<HTMLInputElement>(null)

  const index = useMemo(() => POCKET_DICTIONARY.map(([pl, en]) => ({ pl, en, npl: norm(pl), nen: norm(en) })), [])

  const results = useMemo(() => {
    const q = norm(query)
    if (!q) return []
    const score = (s: string) => (s === q ? 0 : s.startsWith(q) ? 1 : s.includes(q) ? 2 : 9)
    return index
      .map((e) => {
        const a = score(dir === 'pl-en' ? e.npl : e.nen)
        const b = score(dir === 'pl-en' ? e.nen : e.npl) + 0.5 // also match the other language
        return { e, s: Math.min(a, b), reverse: b < a }
      })
      .filter((r) => r.s < 9)
      .sort((x, y) => x.s - y.s)
      .slice(0, 6)
  }, [query, dir, index])

  useEffect(() => {
    // auto-detect direction when the query is clearly in the other language
    const q = norm(query)
    if (!q) return
    const plHit = index.some((e) => e.npl.startsWith(q))
    const enHit = index.some((e) => e.nen.startsWith(q))
    if (dir === 'pl-en' && !plHit && enHit) setDir('en-pl')
    if (dir === 'en-pl' && !enHit && plHit) setDir('pl-en')
  }, [query, dir, index])

  const [from, to] = dir === 'pl-en' ? [t.translator.plToEn.split(' → ')[0], t.translator.plToEn.split(' → ')[1]] : [t.translator.enToPl.split(' → ')[0], t.translator.enToPl.split(' → ')[1]]
  const suggestions = dir === 'pl-en' ? ['kieszeń', 'wolność', 'uczyć się', 'spotkanie'] : ['pocket', 'freedom', 'to learn', 'deadline']

  return (
    <div className="flex h-full flex-col rounded-[32px] bg-navy p-5 text-ivory sm:p-8">
      <p className="eyebrow !text-ivory/55">
        <span className="text-yellow">●</span> {t.translator.eyebrow}
      </p>
      <h3 className="mt-3 font-display text-[1.9rem] leading-[1.05] font-extrabold tracking-[-0.035em]">{t.translator.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ivory/65">{t.translator.lead}</p>

      <div className="mt-6 flex items-center gap-2 font-display text-sm font-bold">
        <span className="rounded-full bg-white/10 px-3 py-1.5">{from}</span>
        <button
          type="button"
          onClick={() => {
            setDir((d) => (d === 'pl-en' ? 'en-pl' : 'pl-en'))
            inputRef.current?.focus()
          }}
          aria-label={t.translator.swap}
          className="grid size-10 place-items-center rounded-full bg-yellow text-navy transition-transform duration-500 ease-out-expo hover:rotate-180"
        >
          ⇄
        </button>
        <span className="rounded-full bg-white/10 px-3 py-1.5">{to}</span>
      </div>

      <label htmlFor="tr-input" className="sr-only">
        {t.translator.label}
      </label>
      <input
        id="tr-input"
        ref={inputRef}
        type="search"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.translator.placeholder}
        lang={dir === 'pl-en' ? 'pl' : 'en'}
        className="mt-4 h-14 w-full rounded-2xl border-2 border-white/10 bg-white/[0.06] px-5 text-lg text-ivory placeholder:text-ivory/35 focus:border-blue focus:outline-none"
      />

      <div aria-live="polite" className="mt-4 min-h-[12rem] flex-1">
        {query.trim() === '' ? (
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-ivory/45 uppercase">{t.translator.hint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => setQuery(s)} className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm transition hover:border-yellow hover:text-yellow">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : results.length ? (
          <>
            <p className="sr-only">{t.translator.results(results.length)}</p>
            <ul className="divide-y divide-white/10">
              {results.map(({ e, reverse }) => {
                const srcIsPl = dir === 'pl-en' ? !reverse : reverse
                return (
                  <li key={e.pl + e.en} className="flex items-baseline justify-between gap-4 py-3">
                    <span lang={srcIsPl ? 'pl' : 'en'} className="text-ivory/70">
                      {srcIsPl ? e.pl : e.en}
                    </span>
                    <span lang={srcIsPl ? 'en' : 'pl'} className="text-right font-display text-xl font-bold text-yellow">
                      {srcIsPl ? e.en : e.pl}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="pt-2 text-ivory/65">{t.translator.none}</p>
        )}
      </div>
    </div>
  )
}
