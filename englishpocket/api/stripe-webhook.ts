/**
 * POST /api/stripe-webhook — Stripe → server notifications.
 * The signature is verified against the raw body with STRIPE_WEBHOOK_SECRET.
 * Subscribe to: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired.
 */
import { fulfillSession } from './_lib/fulfill.ts'
import { config, db, hasSupabase, json, stripe } from './_lib/server.ts'

export async function POST(request: Request): Promise<Response> {
  const s = stripe()
  const { webhookSecret } = config()
  if (!s || !webhookSecret || !hasSupabase()) return json({ ok: false, error: 'not_configured' }, 503)

  const signature = request.headers.get('stripe-signature')
  if (!signature) return json({ ok: false, error: 'no_signature' }, 400)

  const raw = await request.text()
  let event
  try {
    event = await s.webhooks.constructEventAsync(raw, signature, webhookSecret)
  } catch {
    return json({ ok: false, error: 'bad_signature' }, 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await fulfillSession(event.data.object)
        break
      case 'checkout.session.async_payment_failed':
        await db.update('orders', `stripe_session_id=eq.${encodeURIComponent(event.data.object.id)}&status=eq.pending`, { status: 'failed' })
        break
      case 'checkout.session.expired':
        await db.update('orders', `stripe_session_id=eq.${encodeURIComponent(event.data.object.id)}&status=eq.pending`, { status: 'expired' })
        break
    }
  } catch (e) {
    console.error(e)
    // 500 → Stripe retries later.
    return json({ ok: false, error: 'processing_failed' }, 500)
  }
  return json({ received: true })
}
