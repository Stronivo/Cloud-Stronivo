/**
 * POST /api/contact — contact form → Resend.
 * Needs RESEND_API_KEY, CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL. Without them it
 * answers 503 and the form says so; it never pretends a message was sent.
 */
import { config, json } from './_lib/server.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request: Request): Promise<Response> {
  let data: Record<string, unknown>
  try {
    data = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }
  if (str(data.website, 200)) return json({ ok: true }) // honeypot

  const name = str(data.name, 120)
  const email = str(data.email, 200)
  const message = str(data.message, 4000)
  const errors: string[] = []
  if (name.length < 2) errors.push('name')
  if (!EMAIL_RE.test(email)) errors.push('email')
  if (message.length < 10) errors.push('message')
  if (data.consent !== true) errors.push('consent')
  if (errors.length) return json({ ok: false, error: 'validation', fields: errors }, 422)

  const { resendKey } = config()
  const to = process.env.CONTACT_TO_EMAIL?.trim()
  const from = process.env.CONTACT_FROM_EMAIL?.trim()
  if (!resendKey || !to || !from) return json({ ok: false, error: 'not_configured' }, 503)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `EnglishPocket — wiadomość od ${name}`,
      text: `Imię: ${name}\nE-mail: ${email}\n\n${message}`,
    }),
  })
  return res.ok ? json({ ok: true }) : json({ ok: false, error: 'send_failed' }, 502)
}
