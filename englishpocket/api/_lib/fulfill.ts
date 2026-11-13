/**
 * Order fulfilment. Called by the Stripe webhook and, as a fallback, by the
 * order-status endpoint (in case the webhook has not arrived yet).
 *
 * The payment state always comes from Stripe's API, never from the browser.
 * The pending → paid transition is a conditional UPDATE, so only one caller
 * ever wins and the e-mail is sent exactly once.
 */
import type Stripe from 'stripe'
import { config, db, escapeHtml, formatPrice, randomToken, sha256, type OrderRow, type ProductRow } from './server.ts'

export type IssuedLink = { productId: string; name: string; url: string }

export async function issueLinks(order: OrderRow, days: number): Promise<IssuedLink[]> {
  const { siteUrl, maxDownloads } = config()
  const products = await db.select<ProductRow>('products', `select=id,name&id=in.(${order.product_ids.join(',')})`)
  const expires = new Date(Date.now() + days * 86_400_000).toISOString()
  const links: IssuedLink[] = []
  for (const p of products) {
    const token = randomToken()
    await db.insert('download_tokens', {
      token_hash: await sha256(token),
      order_id: order.id,
      product_id: p.id,
      expires_at: expires,
      max_downloads: maxDownloads,
    })
    links.push({ productId: p.id, name: p.name, url: `${siteUrl}/api/download?token=${encodeURIComponent(token)}` })
  }
  return links
}

async function sendOrderEmail(order: OrderRow, links: IssuedLink[]) {
  const { resendKey, emailFrom, linkDays, maxDownloads, siteUrl } = config()
  if (!resendKey || !emailFrom || !order.email) return false

  const items = links
    .map(
      (l) =>
        `<tr><td style="padding:14px 0;border-bottom:1px solid #E7E2D6;font:600 16px/1.4 Arial,sans-serif;color:#17243A">${escapeHtml(l.name)}</td>` +
        `<td style="padding:14px 0;border-bottom:1px solid #E7E2D6;text-align:right"><a href="${l.url}" style="display:inline-block;background:#4978FF;color:#fff;text-decoration:none;font:600 14px Arial,sans-serif;padding:10px 18px;border-radius:999px">Pobierz PDF</a></td></tr>`,
    )
    .join('')

  const html = `<!doctype html><html lang="pl"><body style="margin:0;background:#FAF7F0;padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
<tr><td>
<p style="font:700 22px Arial,sans-serif;color:#17243A;margin:0 0 4px">English<span style="color:#4978FF">Pocket</span></p>
<p style="font:14px Arial,sans-serif;color:#667085;margin:0 0 28px">Angielski bez kursu. Bez presji. Bez limitów.</p>
<h1 style="font:700 24px/1.3 Arial,sans-serif;color:#17243A;margin:0 0 12px">Dziękujemy za zakup!</h1>
<p style="font:16px/1.6 Arial,sans-serif;color:#17243A;margin:0 0 20px">Twoja płatność została potwierdzona. Poniżej znajdziesz linki do pobrania materiałów PDF.</p>
<table role="presentation" width="100%">${items}</table>
<p style="font:14px/1.6 Arial,sans-serif;color:#667085;margin:24px 0 0">Każdy link jest ważny przez ${linkDays} dni i pozwala na ${maxDownloads} pobrań. Zapisz pliki na swoim urządzeniu.${
    order.amount_total != null ? `<br>Kwota zamówienia: ${formatPrice(order.amount_total, order.currency ?? 'pln')}.` : ''
  }</p>
<p style="font:14px/1.6 Arial,sans-serif;color:#667085;margin:16px 0 0">Gdyby link wygasł, wejdź na <a href="${siteUrl}/#formularz" style="color:#4978FF">${siteUrl.replace(/^https?:\/\//, '')}</a> i napisz do nas.</p>
</td></tr></table></body></html>`

  const text = [
    'Dziękujemy za zakup w EnglishPocket!',
    '',
    'Linki do pobrania:',
    ...links.map((l) => `• ${l.name}: ${l.url}`),
    '',
    `Każdy link jest ważny przez ${linkDays} dni i pozwala na ${maxDownloads} pobrań.`,
  ].join('\n')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: emailFrom,
      to: [order.email],
      subject: 'Twoje materiały EnglishPocket są gotowe do pobrania',
      html,
      text,
    }),
  })
  return res.ok
}

/** Marks the order paid if Stripe says so and sends the download e-mail once. Returns the order. */
export async function fulfillSession(session: Stripe.Checkout.Session): Promise<OrderRow | null> {
  const rows = await db.select<OrderRow>('orders', `stripe_session_id=eq.${encodeURIComponent(session.id)}&select=*`)
  const order = rows[0]
  if (!order) return null
  if (session.payment_status !== 'paid') return order

  const email = session.customer_details?.email ?? session.customer_email ?? order.email
  const flipped = await db.update<OrderRow>('orders', `id=eq.${order.id}&status=eq.pending`, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    email,
    amount_total: session.amount_total,
    currency: session.currency,
  })
  if (!flipped[0]) return { ...order, status: 'paid' }

  const paid = flipped[0]
  const links = await issueLinks(paid, config().linkDays)
  const sent = await sendOrderEmail(paid, links)
  if (sent) await db.update('orders', `id=eq.${paid.id}`, { email_sent_at: new Date().toISOString() })
  return paid
}
