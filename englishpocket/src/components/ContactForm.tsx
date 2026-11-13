import { useState } from 'react'
import { useI18n } from '../i18n/I18n'
import { MagneticButton } from './Magnetic'

type Field = 'name' | 'email' | 'message' | 'consent'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function ContactForm() {
  const { t } = useI18n()
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [serverError, setServerError] = useState<'not_configured' | 'generic' | null>(null)
  const [errors, setErrors] = useState<Partial<Record<Field, boolean>>>({})

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const data = {
      name: String(f.get('name') ?? '').trim(),
      email: String(f.get('email') ?? '').trim(),
      message: String(f.get('message') ?? '').trim(),
      consent: f.get('consent') === 'on',
      website: String(f.get('website') ?? ''),
    }
    const errs: Partial<Record<Field, boolean>> = {
      name: data.name.length < 2,
      email: !EMAIL_RE.test(data.email),
      message: data.message.length < 10,
      consent: !data.consent,
    }
    setErrors(errs)
    const first = (Object.keys(errs) as Field[]).find((k) => errs[k])
    if (first) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setState('sending')
    setServerError(null)
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const body = r.headers.get('content-type')?.includes('json') ? await r.json() : null
      if (r.ok && body?.ok) {
        setState('ok')
        ;(e.target as HTMLFormElement).reset()
        return
      }
      setServerError(body?.error === 'not_configured' ? 'not_configured' : 'generic')
    } catch {
      setServerError('generic')
    }
    setState('error')
  }

  const input =
    'mt-2 w-full rounded-2xl border-[1.5px] border-navy/12 bg-white px-4 py-3.5 text-navy transition-colors placeholder:text-navy/30 focus:border-blue focus:outline-none aria-[invalid=true]:border-[#C2412D]'
  const err = (k: Field) => errors[k] && <p id={`err-${k}`} className="mt-1.5 text-sm font-medium text-[#B3261E]">{t.contact.errors[k]}</p>

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div>
        <label htmlFor="c-name" className="text-sm font-semibold text-navy">{t.contact.name}</label>
        <input id="c-name" name="name" autoComplete="given-name" className={input} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name' : undefined} />
        {err('name')}
      </div>
      <div>
        <label htmlFor="c-email" className="text-sm font-semibold text-navy">{t.contact.email}</label>
        <input id="c-email" name="email" type="email" autoComplete="email" className={input} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'err-email' : undefined} />
        {err('email')}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-msg" className="text-sm font-semibold text-navy">{t.contact.message}</label>
        <textarea id="c-msg" name="message" rows={5} className={`${input} resize-y`} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'err-message' : undefined} />
        {err('message')}
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <div className="sm:col-span-2">
        <label className="flex cursor-pointer gap-3 text-sm text-navy/80">
          <input type="checkbox" name="consent" className="mt-0.5 size-[1.15rem] shrink-0 accent-blue" aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'err-consent' : undefined} />
          <span>
            {t.contact.consentPre}{' '}
            <a href="/polityka-prywatnosci" target="_blank" className="font-semibold text-blue underline underline-offset-2">
              {t.contact.consentLink}
            </a>
            .
          </span>
        </label>
        {err('consent')}
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <MagneticButton type="submit" variant="dark" disabled={state === 'sending'}>
          {state === 'sending' ? t.contact.sending : t.contact.send}
        </MagneticButton>
        <p aria-live="polite" className="text-sm font-medium">
          {state === 'ok' && <span className="text-[#1F7A6F]">✓ {t.contact.ok}</span>}
          {state === 'error' && serverError && <span className="text-[#B3261E]">{t.contact.errors[serverError]}</span>}
        </p>
      </div>
    </form>
  )
}
