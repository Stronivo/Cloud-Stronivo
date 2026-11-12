/**
 * Vercel Function: POST /api/contact
 * Sends the contact form to the Stronivo inbox through Resend (https://resend.com).
 *
 * Required environment variables (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY       – Resend API key
 *   CONTACT_TO_EMAIL     – where messages are delivered, e.g. kontakt@stronivo.com
 *   CONTACT_FROM_EMAIL   – a sender on a domain verified in Resend, e.g. "Stronivo <formularz@stronivo.com>"
 *
 * If they are missing the function answers 503 and the form tells the visitor to
 * use e-mail instead — it never pretends a message was sent.
 */

type Payload = {
  name?: unknown
  email?: unknown
  phone?: unknown
  company?: unknown
  type?: unknown
  message?: unknown
  consent?: unknown
  website?: unknown
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

export async function POST(request: Request): Promise<Response> {
  let data: Payload
  try {
    data = (await request.json()) as Payload
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  // Honeypot filled → silently accept, do nothing.
  if (str(data.website, 200)) return json({ ok: true })

  const name = str(data.name, 120)
  const email = str(data.email, 200)
  const phone = str(data.phone, 40)
  const company = str(data.company, 160)
  const type = str(data.type, 60)
  const message = str(data.message, 4000)

  const errors: string[] = []
  if (name.length < 2) errors.push('name')
  if (!EMAIL_RE.test(email)) errors.push('email')
  if (message.length < 20) errors.push('message')
  if (data.consent !== true) errors.push('consent')
  if (errors.length) return json({ ok: false, error: 'validation', fields: errors }, 422)

  const key = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL
  if (!key || !to || !from) return json({ ok: false, error: 'not_configured' }, 503)

  const text = [
    `Imię i nazwisko: ${name}`,
    `E-mail: ${email}`,
    phone && `Telefon: ${phone}`,
    company && `Firma: ${company}`,
    type && `Rodzaj projektu: ${type}`,
    '',
    message,
    '',
    '— Zgoda na przetwarzanie danych: TAK',
  ]
    .filter((l): l is string => typeof l === 'string')
    .join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Nowe zapytanie ze stronivo.com — ${name}`,
      text,
    }),
  })

  if (!res.ok) return json({ ok: false, error: 'send_failed' }, 502)
  return json({ ok: true })
}

export function GET(): Response {
  return json({ ok: false, error: 'method_not_allowed' }, 405)
}
