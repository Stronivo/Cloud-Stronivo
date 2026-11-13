/**
 * Vercel Function: POST /api/lead — sends an inquiry prepared with Stroniq to kontakt@stronivo.com.
 *
 * Body: { name, email, phone?, consent: true, inquiry: {...}, source: "ai" | "kreator", website: "" (honeypot) }
 * Only the needs summary and the contact details the visitor typed into the consent form are
 * sent — never the chat transcript.
 *
 * Delivery (first configured wins):
 *   1. Resend: RESEND_API_KEY + CONTACT_TO_EMAIL + CONTACT_FROM_EMAIL (same as /api/contact)
 *   2. Formspree: STRONIQ_FORMSPREE_ENDPOINT (default: the site's form https://formspree.io/f/mnpaarla)
 */
import { STRONIQ } from './_lib/stroniq/config.js'
import { sanitizeInquiry, type Inquiry } from './_lib/stroniq/prompt.js'
import { clientIp, json, originAllowed, rateLimit, readJson } from './_lib/guard.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^[+()\d\s-]{7,20}$/
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const SITE_LABEL: Record<string, string> = {
  landing_page: 'Landing page',
  strona_firmowa: 'Strona firmowa',
  strona_restauracji: 'Strona restauracji / kawiarni',
  portfolio: 'Portfolio',
  odswiezenie_strony: 'Odświeżenie strony',
  seo: 'SEO i optymalizacja',
  inne: 'Inne',
}

function render(inq: Inquiry, name: string, email: string, phone: string, wizard: boolean) {
  return [
    wizard ? 'Zapytanie przygotowane w kreatorze Stroniq (bez AI) na stronivo.com' : 'Zapytanie przygotowane z asystentem AI Stroniq na stronivo.com',
    '',
    `Imię: ${name}`,
    `E-mail: ${email}`,
    `Telefon: ${phone || '—'}`,
    '',
    `Rodzaj projektu: ${SITE_LABEL[inq.site_type] ?? inq.site_type}`,
    `Branża: ${inq.industry}`,
    `Cel: ${inq.goal || '—'}`,
    `Zakres: ${inq.scope || '—'}`,
    `Funkcje: ${inq.features.length ? inq.features.join(', ') : '—'}`,
    `Budżet: ${inq.budget || '—'}`,
    `Termin: ${inq.timeline || '—'}`,
    '',
    'Podsumowanie:',
    inq.summary,
    '',
    '— Zgoda na przekazanie danych w celu przygotowania wyceny: TAK',
  ].join('\n')
}

async function sendViaResend(subject: string, text: string, replyTo: string): Promise<boolean | null> {
  const key = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL
  if (!key || !to || !from) return null
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text }),
  })
  return res.ok
}

async function sendViaFormspree(subject: string, fields: Record<string, string>): Promise<boolean> {
  const endpoint = process.env.STRONIQ_FORMSPREE_ENDPOINT || 'https://formspree.io/f/mnpaarla'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ _subject: subject, ...fields }),
  })
  return res.ok
}

export async function POST(req: Request): Promise<Response> {
  if (!originAllowed(req)) return json({ error: 'forbidden' }, 403)
  const ip = clientIp(req)
  if (!(await rateLimit('lead-ip', ip, STRONIQ.leadsPerIp, STRONIQ.leadsWindowSec))) return json({ error: 'rate_limited' }, 429)

  const body = (await readJson(req, 16 * 1024)) as Record<string, unknown> | null
  if (!body) return json({ error: 'bad_request' }, 400)
  if (str(body.website, 200)) return json({ ok: true }) // honeypot: pretend success, send nothing

  const name = str(body.name, 120)
  const email = str(body.email, 200)
  const phone = str(body.phone, 30)
  const inquiry = sanitizeInquiry(body.inquiry)
  const fields: string[] = []
  if (name.length < 2) fields.push('name')
  if (!EMAIL_RE.test(email)) fields.push('email')
  if (phone && !PHONE_RE.test(phone)) fields.push('phone')
  if (body.consent !== true) fields.push('consent')
  if (!inquiry) fields.push('inquiry')
  if (fields.length || !inquiry) return json({ error: 'validation', fields }, 422)

  const wizard = body.source === 'kreator'
  const subject = wizard ? `Zapytanie z kreatora Stroniq — ${name}` : `Zapytanie ze Stroniq (AI) — ${name}`
  const text = render(inquiry, name, email, phone, wizard)
  try {
    const viaResend = await sendViaResend(subject, text, email)
    const ok =
      viaResend ??
      (await sendViaFormspree(subject, {
        email,
        'Imię': name,
        Telefon: phone || '—',
        'Rodzaj projektu': SITE_LABEL[inquiry.site_type] ?? inquiry.site_type,
        'Branża': inquiry.industry,
        Cel: inquiry.goal || '—',
        Zakres: inquiry.scope || '—',
        Funkcje: inquiry.features.join(', ') || '—',
        'Budżet': inquiry.budget || '—',
        Termin: inquiry.timeline || '—',
        Podsumowanie: inquiry.summary,
        'Źródło': wizard ? 'Kreator Stroniq (bez AI)' : 'Asystent AI Stroniq',
        Zgoda: 'TAK — przekazanie danych w celu przygotowania wyceny',
      }))
    if (!ok) {
      console.error('[stroniq-lead] delivery failed')
      return json({ error: 'delivery_failed' }, 502)
    }
    return json({ ok: true })
  } catch {
    console.error('[stroniq-lead] delivery error')
    return json({ error: 'delivery_failed' }, 502)
  }
}
