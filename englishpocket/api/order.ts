/**
 * GET /api/order?session_id=cs_...
 * Used by the thank-you page. Asks Stripe for the real payment state, fulfils the
 * order if the webhook has not done it yet, and returns short-lived download links
 * only for a paid order.
 */
import { fulfillSession, issueLinks } from './_lib/fulfill.ts'
import { hasSupabase, json, stripe } from './_lib/server.ts'

export async function GET(request: Request): Promise<Response> {
  const s = stripe()
  if (!s || !hasSupabase()) return json({ ok: false, error: 'not_configured' }, 503)

  const id = new URL(request.url).searchParams.get('session_id') ?? ''
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return json({ ok: false, error: 'invalid_session' }, 400)

  try {
    const session = await s.checkout.sessions.retrieve(id)
    const order = await fulfillSession(session)
    if (!order) return json({ ok: false, error: 'not_found' }, 404)

    if (session.payment_status !== 'paid') {
      return json({ ok: true, status: session.status === 'expired' ? 'expired' : 'processing' })
    }
    // Fresh 24-hour links are shown only during the first week after payment;
    // later the buyer uses the e-mail or contacts us.
    const paidAt = order.paid_at ? Date.parse(order.paid_at) : Date.now()
    const recent = Date.now() - paidAt < 7 * 86_400_000
    const links = recent ? await issueLinks({ ...order, status: 'paid' }, 1) : []
    return json({
      ok: true,
      status: 'paid',
      email: session.customer_details?.email ?? null,
      links: links.map(({ name, url }) => ({ name, url })),
    })
  } catch (e) {
    console.error(e)
    return json({ ok: false, error: 'lookup_failed' }, 502)
  }
}
