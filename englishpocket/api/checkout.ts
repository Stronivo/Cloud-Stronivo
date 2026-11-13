/**
 * POST /api/checkout  { slugs: string[], consent: true }
 * Creates a Stripe Checkout session. Prices are read from the database on the
 * server — whatever the browser sends about prices is ignored.
 */
import { config, db, hasSupabase, json, stripe, type ProductRow } from './_lib/server.ts'

export async function POST(request: Request): Promise<Response> {
  const s = stripe()
  if (!s || !hasSupabase()) return json({ ok: false, error: 'not_configured' }, 503)

  let body: { slugs?: unknown; consent?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const slugs = Array.isArray(body.slugs)
    ? [...new Set(body.slugs.filter((x): x is string => typeof x === 'string' && /^[a-z0-9-]{1,60}$/.test(x)))].slice(0, 10)
    : []
  if (!slugs.length) return json({ ok: false, error: 'empty_cart' }, 422)
  if (body.consent !== true) return json({ ok: false, error: 'consent_required' }, 422)

  const products = await db.select<ProductRow>(
    'products',
    `select=*&active=eq.true&slug=in.(${slugs.join(',')})`,
  )
  const sellable = products.filter((p) => p.file_path && p.price_amount > 0)
  if (sellable.length !== slugs.length) return json({ ok: false, error: 'unavailable' }, 409)

  const currencies = new Set(sellable.map((p) => p.currency.toLowerCase()))
  if (currencies.size !== 1) return json({ ok: false, error: 'mixed_currency' }, 409)

  const { siteUrl } = config()
  try {
    const session = await s.checkout.sessions.create({
      mode: 'payment',
      locale: 'pl',
      line_items: sellable.map((p) => ({
        quantity: 1,
        price_data: {
          currency: p.currency.toLowerCase(),
          unit_amount: p.price_amount,
          product_data: { name: p.name, ...(p.description ? { description: p.description.slice(0, 300) } : {}) },
        },
      })),
      customer_creation: 'if_required',
      billing_address_collection: 'auto',
      metadata: { source: 'englishpocket', consent_digital: 'true' },
      success_url: `${siteUrl}/zamowienie?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?koszyk=anulowano#materialy`,
    })

    await db.insert('orders', {
      stripe_session_id: session.id,
      status: 'pending',
      product_ids: sellable.map((p) => p.id),
      amount_total: session.amount_total,
      currency: session.currency,
      consent_digital: true,
    })

    return json({ ok: true, url: session.url })
  } catch (e) {
    console.error(e)
    return json({ ok: false, error: 'stripe_error' }, 502)
  }
}

export function GET(): Response {
  return json({ ok: false, error: 'method_not_allowed' }, 405)
}
