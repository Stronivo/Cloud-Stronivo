import { useId, useRef, useState, type FormEvent } from 'react'
import { CONTACT } from '../data/site'
import { MagneticButton } from './Magnetic'

/**
 * The form posts JSON to a real endpoint:
 *   - VITE_CONTACT_ENDPOINT if set (e.g. Formspree / Web3Forms / own API), otherwise
 *   - /api/contact — the Vercel function in /api/contact.ts (sends via Resend).
 * Nothing is simulated: if the endpoint is not configured the user is told so
 * and given the e-mail address instead.
 */
const ENDPOINT = (import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined) || '/api/contact'

const PROJECT_TYPES = ['Strona internetowa', 'Landing page', 'Odświeżenie strony', 'SEO i optymalizacja', 'Jeszcze nie wiem']

type Values = {
  name: string
  email: string
  phone: string
  company: string
  type: string
  message: string
  consent: boolean
  website: string // honeypot
}
type Errors = Partial<Record<keyof Values, string>>
type Status = 'idle' | 'sending' | 'success' | 'error' | 'unavailable'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^[+()\d\s-]{7,20}$/

function validate(v: Values): Errors {
  const e: Errors = {}
  if (v.name.trim().length < 2) e.name = 'Podaj imię i nazwisko (min. 2 znaki).'
  if (!v.email.trim()) e.email = 'Podaj adres e-mail.'
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Ten adres e-mail wygląda na niepoprawny, np. jan@firma.pl.'
  if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) e.phone = 'Numer może zawierać cyfry, spacje, „+” i „-”.'
  if (v.message.trim().length < 20) e.message = 'Napisz kilka zdań o projekcie (min. 20 znaków).'
  if (v.message.length > 4000) e.message = 'Wiadomość może mieć maksymalnie 4000 znaków.'
  if (!v.consent) e.consent = 'Zgoda jest potrzebna, abyśmy mogli odpowiedzieć na wiadomość.'
  return e
}

const initial: Values = { name: '', email: '', phone: '', company: '', type: PROJECT_TYPES[0], message: '', consent: false, website: '' }

export function ContactForm() {
  const uid = useId()
  const [values, setValues] = useState<Values>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    const next = { ...values, [k]: val }
    setValues(next)
    if (touched[k]) setErrors(validate(next))
  }
  const blur = (k: keyof Values) => {
    setTouched((t) => ({ ...t, [k]: true }))
    setErrors(validate(values))
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    setTouched({ name: true, email: true, phone: true, message: true, consent: true })
    const firstInvalid = Object.keys(errs)[0]
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus()
      return
    }

    setStatus('sending')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          company: values.company.trim(),
          type: values.type,
          message: values.message.trim(),
          consent: values.consent,
          website: values.website,
        }),
      })
      if (res.ok) {
        setStatus('success')
        setValues(initial)
        setTouched({})
      } else if (res.status === 404 || res.status === 405 || res.status === 501 || res.status === 503) {
        setStatus('unavailable')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
    requestAnimationFrame(() => statusRef.current?.focus())
  }

  const err = (k: keyof Values) => (touched[k] ? errors[k] : undefined)
  const fid = (k: string) => `${uid}-${k}`

  const field =
    'peer w-full rounded-xl border bg-ink-2 px-4 pb-3 pt-7 text-paper placeholder-transparent outline-none transition-[border-color,box-shadow] duration-300 ' +
    'focus:border-lime focus:shadow-[0_0_0_4px_rgb(198_255_77/0.12)] aria-[invalid=true]:border-[#ff8a7a]'
  const label =
    'pointer-events-none absolute left-4 top-2.5 text-xs text-mist transition-all duration-200 ' +
    'peer-placeholder-shown:top-[1.15rem] peer-placeholder-shown:text-base peer-focus:top-2.5 peer-focus:text-xs peer-focus:text-lime'

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} aria-labelledby={fid('title')} className="relative">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h3 id={fid('title')} className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Formularz kontaktowy
        </h3>
        <p className="shrink-0 text-sm text-mist">
          <span aria-hidden className="text-lime">*</span> pola wymagane
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={fid('name')} error={err('name')}>
          <input
            id={fid('name')}
            name="name"
            autoComplete="name"
            required
            placeholder=" "
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => blur('name')}
            aria-invalid={!!err('name')}
            aria-describedby={err('name') ? `${fid('name')}-err` : undefined}
            className={`${field} border-line`}
          />
          <label htmlFor={fid('name')} className={label}>
            Imię i nazwisko <span aria-hidden className="text-lime">*</span>
          </label>
        </Field>

        <Field id={fid('email')} error={err('email')}>
          <input
            id={fid('email')}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder=" "
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={() => blur('email')}
            aria-invalid={!!err('email')}
            aria-describedby={err('email') ? `${fid('email')}-err` : undefined}
            className={`${field} border-line`}
          />
          <label htmlFor={fid('email')} className={label}>
            E-mail <span aria-hidden className="text-lime">*</span>
          </label>
        </Field>

        <Field id={fid('phone')} error={err('phone')}>
          <input
            id={fid('phone')}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder=" "
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            onBlur={() => blur('phone')}
            aria-invalid={!!err('phone')}
            aria-describedby={err('phone') ? `${fid('phone')}-err` : undefined}
            className={`${field} border-line`}
          />
          <label htmlFor={fid('phone')} className={label}>
            Telefon (opcjonalnie)
          </label>
        </Field>

        <Field id={fid('company')}>
          <input
            id={fid('company')}
            name="company"
            autoComplete="organization"
            placeholder=" "
            value={values.company}
            onChange={(e) => set('company', e.target.value)}
            className={`${field} border-line`}
          />
          <label htmlFor={fid('company')} className={label}>
            Firma (opcjonalnie)
          </label>
        </Field>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-3 text-sm text-mist">Czego potrzebujesz?</legend>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map((t) => (
            <label key={t} className="relative">
              <input
                type="radio"
                name="type"
                value={t}
                checked={values.type === t}
                onChange={() => set('type', t)}
                className="peer absolute inset-0 opacity-0"
              />
              <span className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-sm text-mist transition-colors peer-checked:border-lime peer-checked:bg-lime peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime hover:text-paper peer-checked:hover:text-ink">
                {t}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <Field id={fid('message')} error={err('message')}>
          <textarea
            id={fid('message')}
            name="message"
            required
            rows={6}
            maxLength={4000}
            placeholder=" "
            value={values.message}
            onChange={(e) => set('message', e.target.value)}
            onBlur={() => blur('message')}
            aria-invalid={!!err('message')}
            aria-describedby={`${fid('message')}-hint${err('message') ? ` ${fid('message')}-err` : ''}`}
            className={`${field} resize-y border-line`}
          />
          <label htmlFor={fid('message')} className={label}>
            Opowiedz o swoim pomyśle <span aria-hidden className="text-lime">*</span>
          </label>
          <p id={`${fid('message')}-hint`} className="mt-2 text-right text-xs tabular-nums text-mist">
            {values.message.length} / 4000
          </p>
        </Field>
      </div>

      {/* Honeypot — hidden from people and assistive tech, bots tend to fill it */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={fid('website')}>Nie wypełniaj tego pola</label>
        <input id={fid('website')} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
      </div>

      <div className="mt-4">
        <div className="flex items-start gap-3">
          <input
            id={fid('consent')}
            name="consent"
            type="checkbox"
            checked={values.consent}
            onChange={(e) => {
              set('consent', e.target.checked)
              setTouched((t) => ({ ...t, consent: true }))
              setErrors(validate({ ...values, consent: e.target.checked }))
            }}
            aria-invalid={!!err('consent')}
            aria-describedby={err('consent') ? `${fid('consent')}-err` : undefined}
            className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-md border border-line bg-ink-2 bg-center bg-no-repeat transition-colors checked:border-lime checked:bg-lime checked:[background-image:url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%3E%3Cpath%20d=%22M5%2010.5l3%203%207-7%22%20fill=%22none%22%20stroke=%22%2310131A%22%20stroke-width=%222.4%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] aria-[invalid=true]:border-[#ff8a7a]"
          />
          <label htmlFor={fid('consent')} className="text-sm leading-relaxed text-mist">
            Wyrażam zgodę na przetwarzanie moich danych osobowych podanych w formularzu w celu udzielenia odpowiedzi na
            zapytanie. Zapoznałem(-am) się z{' '}
            <a href="/polityka-prywatnosci" className="text-paper underline underline-offset-4 hover:text-lime">
              polityką prywatności
            </a>
            . <span aria-hidden className="text-lime">*</span>
          </label>
        </div>
        {err('consent') && (
          <p id={`${fid('consent')}-err`} className="mt-2 pl-8 text-sm text-[#ff8a7a]">
            {err('consent')}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <MagneticButton type="submit" disabled={status === 'sending'} className="disabled:opacity-60">
          {status === 'sending' ? 'Wysyłanie…' : 'Wyślij wiadomość'}
        </MagneticButton>
        <p className="text-xs text-mist">Odpowiadamy na wiadomości tak szybko, jak to możliwe.</p>
      </div>

      <div ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="mt-6 outline-none empty:hidden">
        {status === 'success' && (
          <Notice tone="ok" title="Dziękujemy — wiadomość została wysłana.">
            Odezwiemy się na podany adres e-mail.
          </Notice>
        )}
        {status === 'error' && (
          <Notice tone="err" title="Nie udało się wysłać wiadomości.">
            Sprawdź połączenie i spróbuj ponownie albo napisz bezpośrednio na{' '}
            <a className="underline" href={`mailto:${CONTACT.email}`}>
              {CONTACT.email}
            </a>
            .
          </Notice>
        )}
        {status === 'unavailable' && (
          <Notice tone="err" title="Formularz nie jest jeszcze aktywny.">
            Twoja wiadomość nie została wysłana. Napisz do nas bezpośrednio:{' '}
            <a className="underline" href={`mailto:${CONTACT.email}`}>
              {CONTACT.email}
            </a>
            .
          </Notice>
        )}
      </div>
    </form>
  )
}

function Field({ id, error, children }: { id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-2 text-sm text-[#ff8a7a]">
          {error}
        </p>
      )}
    </div>
  )
}

function Notice({ tone, title, children }: { tone: 'ok' | 'err'; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border px-5 py-4 ${tone === 'ok' ? 'border-lime/60 bg-lime/5' : 'border-[#ff8a7a]/50 bg-[#ff8a7a]/5'}`}>
      <p className={`font-medium ${tone === 'ok' ? 'text-lime' : 'text-[#ffb3a8]'}`}>{title}</p>
      <p className="mt-1 text-sm text-mist">{children}</p>
    </div>
  )
}
