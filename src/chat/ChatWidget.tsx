import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CHAT } from './config'
import { FormattedText } from './format'

/* ------------------------------------------------------------------ types */

type Inquiry = {
  site_type: string
  industry: string
  goal: string
  scope: string
  features: string[]
  budget: string
  timeline: string
  summary: string
}
type LeadState = 'form' | 'sending' | 'sent' | 'error'
type Msg =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string; inquiry?: Inquiry; lead?: LeadState; streaming?: boolean }
  | { id: string; kind: 'notice'; text: string; tone: 'info' | 'error' | 'ok'; contact?: boolean }
  | { id: string; kind: 'contact' }

const uid = () => Math.random().toString(36).slice(2, 10)

const SITE_LABEL: Record<string, string> = {
  landing_page: 'Landing page',
  strona_firmowa: 'Strona firmowa',
  strona_restauracji: 'Strona restauracji / kawiarni',
  portfolio: 'Portfolio',
  odswiezenie_strony: 'Odświeżenie strony',
  seo: 'SEO i optymalizacja',
  inne: 'Inne',
}

const ERRORS: Record<string, string> = {
  rate_limited: 'Wysłano zbyt wiele wiadomości w krótkim czasie. Spróbuj ponownie za kilka minut.',
  busy: 'Asystent jest teraz przeciążony. Spróbuj za chwilę albo napisz do nas bezpośrednio.',
  too_long: 'Ta wiadomość lub rozmowa jest zbyt długa. Skróć wiadomość albo zacznij nową rozmowę.',
  refusal: 'Nie mogę pomóc w tej sprawie. Jeśli chodzi o stronę internetową — napisz do zespołu.',
  not_configured: 'Asystent AI jest chwilowo niedostępny.',
  upstream: 'Nie udało się uzyskać odpowiedzi. Spróbuj ponownie albo skontaktuj się z nami.',
  bad_request: 'Nie udało się przetworzyć wiadomości. Spróbuj ponownie.',
  empty: 'Nie udało się uzyskać odpowiedzi. Spróbuj zadać pytanie inaczej.',
  invalid_inquiry: 'Nie udało się przygotować podsumowania. Opisz proszę jeszcze raz, czego potrzebujesz.',
  network: 'Brak połączenia z serwerem. Sprawdź internet albo skontaktuj się z nami bezpośrednio.',
}

/** What the model sees: user + assistant turns only (UI notices and the fixed greeting are not sent). */
function toApiHistory(msgs: Msg[]) {
  const out: { role: 'user' | 'assistant'; content: string }[] = []
  for (const m of msgs) {
    if (m.kind === 'user') out.push({ role: 'user', content: m.text })
    if (m.kind === 'assistant' && !m.streaming) {
      const extra = m.inquiry ? `\n\n[Przygotowano podsumowanie zapytania: ${m.inquiry.summary}]` : ''
      const content = `${m.text}${extra}`.trim()
      if (content) out.push({ role: 'assistant', content })
    }
  }
  return out
}

function loadSaved(): Msg[] {
  try {
    const raw = sessionStorage.getItem(CHAT.storageKey)
    const list = raw ? (JSON.parse(raw) as Msg[]) : []
    return Array.isArray(list) ? list.filter((m) => !(m.kind === 'assistant' && m.streaming)) : []
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ widget */

export default function ChatWidget({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(loadSaved)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [visible, setVisible] = useState(false) // for enter/exit animation
  const [announce, setAnnounce] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const titleId = useId()

  const userTurns = msgs.filter((m) => m.kind === 'user').length
  const limitReached = userTurns >= CHAT.maxUserTurns

  // availability check (no secrets — the server only says whether it is configured)
  useEffect(() => {
    let alive = true
    fetch(CHAT.endpoint, { method: 'GET', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((d: { available?: boolean }) => alive && setAvailable(Boolean(d.available)))
      .catch(() => alive && setAvailable(false))
    return () => {
      alive = false
    }
  }, [])

  // persist the conversation for this tab only
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT.storageKey, JSON.stringify(msgs.filter((m) => !(m.kind === 'assistant' && m.streaming))))
    } catch {
      /* storage unavailable (private mode) — conversation simply isn't kept */
    }
  }, [msgs])

  // open / close animation, focus management, Escape, scroll lock on phones
  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const r = requestAnimationFrame(() => setVisible(true))
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 120)
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const small = window.matchMedia('(max-width: 639.98px)').matches
    const prev = document.body.style.overflow
    if (small) document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(r)
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  // keep the newest message in view
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, busy, open])

  useEffect(() => () => abortRef.current?.abort(), [])

  const patchAssistant = useCallback((id: string, fn: (m: Extract<Msg, { kind: 'assistant' }>) => Msg) => {
    setMsgs((list) => list.map((m) => (m.id === id && m.kind === 'assistant' ? fn(m) : m)))
  }, [])

  const notice = (text: string, tone: 'info' | 'error' | 'ok' = 'error', contact = true): Msg => ({ id: uid(), kind: 'notice', text, tone, contact })

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, CHAT.maxUserChars)
      if (!content || busy || limitReached || available === false) return
      const userMsg: Msg = { id: uid(), kind: 'user', text: content }
      const botId = uid()
      const history = toApiHistory([...msgs, userMsg])
      setMsgs((l) => [...l, userMsg, { id: botId, kind: 'assistant', text: '', streaming: true }])
      setInput('')
      setBusy(true)

      const ctrl = new AbortController()
      abortRef.current = ctrl
      let errorCode: string | null = null
      try {
        const res = await fetch(CHAT.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: ctrl.signal,
        })
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          errorCode = data.error ?? 'upstream'
          if (errorCode === 'not_configured') setAvailable(false)
        } else {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let nl: number
            while ((nl = buffer.indexOf('\n')) >= 0) {
              const line = buffer.slice(0, nl).trim()
              buffer = buffer.slice(nl + 1)
              if (!line) continue
              let ev: { t: string; v?: unknown; code?: string }
              try {
                ev = JSON.parse(line)
              } catch {
                continue
              }
              if (ev.t === 'text' && typeof ev.v === 'string') {
                const chunk = ev.v
                patchAssistant(botId, (m) => ({ ...m, text: m.text + chunk }))
              } else if (ev.t === 'reset') {
                patchAssistant(botId, (m) => ({ ...m, text: '' }))
              } else if (ev.t === 'inquiry' && ev.v && typeof ev.v === 'object') {
                const inquiry = ev.v as Inquiry
                patchAssistant(botId, (m) => ({ ...m, inquiry, lead: 'form' }))
              } else if (ev.t === 'error') {
                errorCode = ev.code ?? 'upstream'
                if (errorCode === 'not_configured') setAvailable(false)
              }
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        errorCode = 'network'
      } finally {
        abortRef.current = null
        setBusy(false)
      }

      setMsgs((list) => {
        const bot = list.find((m) => m.id === botId)
        const hasContent = bot && bot.kind === 'assistant' && (bot.text.trim() || bot.inquiry)
        let next = list.map((m) => (m.id === botId && m.kind === 'assistant' ? { ...m, streaming: false } : m))
        if (!hasContent) next = next.filter((m) => m.id !== botId)
        if (errorCode) next = [...next, notice(ERRORS[errorCode] ?? ERRORS.upstream)]
        return next
      })
      if (!errorCode) setAnnounce('Nowa odpowiedź asystenta.')
    },
    [busy, limitReached, available, msgs, patchAssistant],
  )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send(input)
    }
  }

  const quick = (q: (typeof CHAT.quickReplies)[number]) => {
    if ('action' in q) setMsgs((l) => [...l, { id: uid(), kind: 'contact' }])
    else send(q.send)
  }

  const reset = () => {
    abortRef.current?.abort()
    setBusy(false)
    setMsgs([])
    setInput('')
    inputRef.current?.focus()
  }

  const submitLead = async (msgId: string, inquiry: Inquiry, data: { name: string; email: string; phone: string; website: string }) => {
    patchAssistant(msgId, (m) => ({ ...m, lead: 'sending' }))
    try {
      const res = await fetch(CHAT.leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, consent: true, inquiry }),
      })
      if (res.ok) {
        patchAssistant(msgId, (m) => ({ ...m, lead: 'sent' }))
        setMsgs((l) => [...l, notice('Dziękujemy! Zapytanie trafiło do zespołu Stronivo. Odpowiemy na podany adres e-mail.', 'ok', false)])
        return
      }
      patchAssistant(msgId, (m) => ({ ...m, lead: 'error' }))
      const code = ((await res.json().catch(() => ({}))) as { error?: string }).error
      setMsgs((l) => [
        ...l,
        notice(
          code === 'rate_limited'
            ? 'Wysłano już kilka zapytań w ostatniej godzinie. Napisz do nas bezpośrednio.'
            : 'Nie udało się wysłać zapytania. Skorzystaj z formularza kontaktowego albo napisz na kontakt@stronivo.com.',
        ),
      ])
    } catch {
      patchAssistant(msgId, (m) => ({ ...m, lead: 'error' }))
      setMsgs((l) => [...l, notice(ERRORS.network)])
    }
  }

  const showGreeting = available !== false
  const showQuick = msgs.every((m) => m.kind !== 'user') && !busy
  const waiting = busy && msgs.some((m) => m.kind === 'assistant' && m.streaming && !m.text)

  return (
    <div
      id="stroniq-panel"
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      aria-hidden={!open}
      className={`stroniq-panel fixed z-50 flex flex-col overflow-hidden border-line bg-ink text-paper shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] max-sm:inset-0 max-sm:h-[100dvh] sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100vh-8rem))] sm:w-[400px] sm:rounded-[24px] sm:border ${
        visible && open ? 'is-open' : ''
      }`}
    >
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 max-sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="relative">
          <img src="/stroniq/stroniq-128.webp" alt="" width={40} height={40} className="size-10 rounded-full bg-black object-cover" />
          <span
            aria-hidden
            className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-ink ${available === false ? 'bg-mist' : 'bg-lime'}`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-base font-semibold leading-tight">
            {CHAT.name}
          </h2>
          <p className="truncate text-xs text-mist">{available === false ? 'Chwilowo niedostępny' : CHAT.role}</p>
        </div>
        {msgs.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="rounded-full px-3 py-2 text-xs text-mist transition-colors hover:bg-surface hover:text-paper"
          >
            Nowa rozmowa
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij czat"
          className="flex size-10 items-center justify-center rounded-full text-mist transition-colors hover:bg-surface hover:text-paper"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-5">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* AI disclosure + privacy */}
      <p className="border-b border-line/60 bg-ink-2 px-4 py-2 text-[0.7rem] leading-snug text-mist">
        Rozmawiasz z <strong className="font-medium text-paper">asystentem AI</strong> — odpowiedzi mogą zawierać błędy, a wiążące
        informacje przekaże zespół Stronivo. Nie podawaj w czacie danych wrażliwych.{' '}
        <a href="/polityka-prywatnosci" className="underline underline-offset-2 hover:text-paper">
          Prywatność
        </a>
      </p>

      {/* messages */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="off">
        {showGreeting && (
          <Bubble kind="assistant">
            <FormattedText text={CHAT.greeting} />
          </Bubble>
        )}
        {available === false && msgs.length === 0 && (
          <Notice tone="info" contact>
            Asystent AI jest chwilowo niedostępny. Możesz napisać do nas bezpośrednio — odpowiemy tak szybko, jak to możliwe.
          </Notice>
        )}
        {showQuick && available !== false && (
          <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Szybkie opcje">
            {CHAT.quickReplies.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => quick(q)}
                disabled={available === null && !('action' in q)}
                className="rounded-full border border-lime/40 px-3.5 py-2 text-sm text-paper transition-colors hover:border-lime hover:bg-lime hover:text-ink disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        {msgs.map((m) => {
          if (m.kind === 'user') return <Bubble key={m.id} kind="user">{m.text}</Bubble>
          if (m.kind === 'contact') return <ContactCard key={m.id} />
          if (m.kind === 'notice')
            return (
              <Notice key={m.id} tone={m.tone} contact={m.contact}>
                {m.text}
              </Notice>
            )
          if (!m.text && !m.inquiry) return null
          return (
            <div key={m.id} className="space-y-3">
              {m.text && (
                <Bubble kind="assistant">
                  <FormattedText text={m.text} />
                </Bubble>
              )}
              {m.inquiry && <InquiryCard inquiry={m.inquiry} state={m.lead ?? 'form'} onSubmit={(d) => submitLead(m.id, m.inquiry!, d)} />}
            </div>
          )
        })}

        {waiting && (
          <div className="flex items-center gap-2" aria-label="Asystent pisze">
            <span className="stroniq-typing flex gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        {limitReached && (
          <Notice tone="info" contact>
            To już długa rozmowa — najlepiej będzie, jeśli dalej zajmie się nią zespół Stronivo.
          </Notice>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {/* composer */}
      <form onSubmit={onSubmit} className="border-t border-line px-3 py-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-ink-2 p-1.5 transition-colors focus-within:border-lime/60">
          <label htmlFor="stroniq-input" className="sr-only">
            Twoja wiadomość
          </label>
          <textarea
            id="stroniq-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, CHAT.maxUserChars))}
            onKeyDown={onKeyDown}
            maxLength={CHAT.maxUserChars}
            disabled={available === false || limitReached}
            placeholder={available === false ? 'Asystent niedostępny' : 'Napisz wiadomość…'}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-[0.95rem] text-paper outline-none placeholder:text-mist/70 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy || available === false || limitReached}
            aria-label="Wyślij wiadomość"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime text-ink transition-opacity disabled:opacity-35"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="size-5">
              <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[0.68rem] text-mist">
          Wolisz człowieka?{' '}
          <a href={`mailto:${CHAT.email}`} className="underline underline-offset-2 hover:text-paper">
            {CHAT.email}
          </a>
        </p>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

function Bubble({ kind, children }: { kind: 'user' | 'assistant'; children: React.ReactNode }) {
  return kind === 'user' ? (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-lime px-4 py-2.5 text-[0.93rem] leading-relaxed text-ink">
        {children}
      </div>
    </div>
  ) : (
    <div className="flex">
      <div className="max-w-[90%] break-words rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-[0.93rem] leading-relaxed text-paper/95">
        {children}
      </div>
    </div>
  )
}

function Notice({ tone, contact, children }: { tone: 'info' | 'error' | 'ok'; contact?: boolean; children: React.ReactNode }) {
  const color = tone === 'ok' ? 'border-lime/50 text-paper' : tone === 'error' ? 'border-[#ff8a7a]/50 text-paper' : 'border-line text-paper'
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border border-dashed px-4 py-3 text-sm ${color}`}>
      <p>{children}</p>
      {contact && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-mist">
          <a href={`mailto:${CHAT.email}`} className="text-lime underline underline-offset-2">
            {CHAT.email}
          </a>
          <a href="/#formularz" className="text-lime underline underline-offset-2">
            Formularz kontaktowy
          </a>
        </p>
      )}
    </div>
  )
}

function ContactCard() {
  return (
    <div className="rounded-2xl border border-line bg-ink-2 p-4 text-sm">
      <p className="font-display font-semibold">Kontakt z zespołem Stronivo</p>
      <ul className="mt-2 space-y-1.5 text-mist">
        <li>
          E-mail:{' '}
          <a href={`mailto:${CHAT.email}`} className="text-lime underline underline-offset-2">
            {CHAT.email}
          </a>
        </li>
        <li>
          <a href="/#formularz" className="text-lime underline underline-offset-2">
            Formularz kontaktowy
          </a>
        </li>
      </ul>
      <p className="mt-2 text-xs text-mist">Możesz też opisać tu swój projekt — przygotuję podsumowanie zapytania dla zespołu.</p>
    </div>
  )
}

function InquiryCard({
  inquiry,
  state,
  onSubmit,
}: {
  inquiry: Inquiry
  state: LeadState
  onSubmit: (d: { name: string; email: string; phone: string; website: string }) => void
}) {
  const id = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')

  const rows: [string, string][] = [
    ['Rodzaj', SITE_LABEL[inquiry.site_type] ?? inquiry.site_type],
    ['Branża', inquiry.industry],
    ['Cel', inquiry.goal],
    ['Zakres', inquiry.scope],
    ['Funkcje', inquiry.features.join(', ')],
    ['Budżet', inquiry.budget],
    ['Termin', inquiry.timeline],
  ]
  const shown = rows.filter(([, v]) => v && !/^nie podano$/i.test(v))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Podaj imię (min. 2 znaki).')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('Podaj poprawny adres e-mail.')
    if (phone.trim() && !/^[+()\d\s-]{7,20}$/.test(phone.trim())) return setError('Numer telefonu wygląda na niepoprawny.')
    if (!consent) return setError('Zaznacz zgodę, abyśmy mogli przekazać zapytanie zespołowi.')
    setError('')
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), website })
  }

  const field =
    'w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-paper outline-none transition-colors placeholder:text-mist/60 focus:border-lime/70'

  return (
    <div className="rounded-2xl border border-lime/40 bg-ink-2 p-4">
      <p className="font-display text-sm font-semibold text-lime">Podsumowanie zapytania</p>
      <p className="mt-2 text-sm leading-relaxed text-paper/95">{inquiry.summary}</p>
      {shown.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {shown.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-mist">{k}</dt>
              <dd className="text-paper/90">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {state === 'sent' ? (
        <p className="mt-4 rounded-xl bg-lime/10 px-3 py-2 text-sm text-lime" role="status">
          Wysłano do zespołu Stronivo ✓
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-4 space-y-2.5" aria-describedby={error ? `${id}-err` : undefined}>
          <p className="text-xs text-mist">Aby wysłać zapytanie, podaj dane kontaktowe:</p>
          <label className="sr-only" htmlFor={`${id}-n`}>
            Imię
          </label>
          <input id={`${id}-n`} className={field} placeholder="Imię *" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <label className="sr-only" htmlFor={`${id}-e`}>
            E-mail
          </label>
          <input
            id={`${id}-e`}
            className={field}
            type="email"
            inputMode="email"
            placeholder="E-mail *"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
          />
          <label className="sr-only" htmlFor={`${id}-p`}>
            Telefon (opcjonalnie)
          </label>
          <input
            id={`${id}-p`}
            className={field}
            type="tel"
            inputMode="tel"
            placeholder="Telefon (opcjonalnie)"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
          />
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-mist">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[#c6ff4d]"
            />
            <span>
              Zgadzam się na przekazanie tego podsumowania oraz moich danych kontaktowych zespołowi Stronivo (kontakt@stronivo.com) w celu
              przygotowania wyceny. Szczegóły w{' '}
              <a href="/polityka-prywatnosci" className="text-paper underline underline-offset-2">
                polityce prywatności
              </a>
              . *
            </span>
          </label>
          {error && (
            <p id={`${id}-err`} role="alert" className="text-xs text-[#ff8a7a]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={state === 'sending'}
            className="w-full rounded-xl bg-lime px-4 py-2.5 font-display text-sm font-medium text-ink transition-opacity disabled:opacity-60"
          >
            {state === 'sending' ? 'Wysyłanie…' : state === 'error' ? 'Spróbuj ponownie' : 'Wyślij zapytanie'}
          </button>
        </form>
      )}
    </div>
  )
}
