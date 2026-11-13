/**
 * Shared server helpers for the Vercel functions in /api.
 * Files in folders starting with "_" are not exposed as routes by Vercel.
 *
 * Nothing here ever reaches the browser bundle: keys stay on the server.
 */
import Stripe from 'stripe'

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })

const env = (name: string) => process.env[name]?.trim() || ''

export function config() {
  return {
    supabaseUrl: env('SUPABASE_URL').replace(/\/$/, ''),
    supabaseKey: env('SUPABASE_SERVICE_ROLE_KEY'),
    bucket: env('SUPABASE_MATERIALS_BUCKET') || 'materials',
    stripeKey: env('STRIPE_SECRET_KEY'),
    webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
    resendKey: env('RESEND_API_KEY'),
    emailFrom: env('ORDER_FROM_EMAIL'),
    siteUrl: (env('SITE_URL') || 'http://localhost:5173').replace(/\/$/, ''),
    linkDays: Number(env('DOWNLOAD_LINK_DAYS')) || 7,
    maxDownloads: Number(env('DOWNLOAD_MAX_COUNT')) || 5,
  }
}

export const hasSupabase = () => {
  const c = config()
  return Boolean(c.supabaseUrl && c.supabaseKey)
}

let stripeClient: Stripe | null = null
export function stripe(): Stripe | null {
  const { stripeKey } = config()
  if (!stripeKey) return null
  stripeClient ??= new Stripe(stripeKey)
  return stripeClient
}

/* ---------------- Supabase (PostgREST + Storage over fetch) ---------------- */

async function sb(path: string, init: RequestInit = {}) {
  const { supabaseUrl, supabaseKey } = config()
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const db = {
  select: <T>(table: string, query: string) => sb(`/rest/v1/${table}?${query}`) as Promise<T[]>,
  insert: <T>(table: string, row: object) =>
    sb(`/rest/v1/${table}`, { method: 'POST', body: JSON.stringify(row), headers: { Prefer: 'return=representation' } }) as Promise<T[]>,
  update: <T>(table: string, query: string, patch: object) =>
    sb(`/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      headers: { Prefer: 'return=representation' },
    }) as Promise<T[]>,
  rpc: <T>(fn: string, args: object) => sb(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) }) as Promise<T>,
}

/** Short-lived signed URL to a file in the private materials bucket. */
export async function signedFileUrl(filePath: string, seconds = 60) {
  const { supabaseUrl, bucket } = config()
  const encoded = filePath.split('/').map(encodeURIComponent).join('/')
  const data = (await sb(`/storage/v1/object/sign/${bucket}/${encoded}`, {
    method: 'POST',
    body: JSON.stringify({ expiresIn: seconds }),
  })) as { signedURL?: string; signedUrl?: string }
  const rel = data.signedURL ?? data.signedUrl
  if (!rel) throw new Error('No signed URL returned')
  return `${supabaseUrl}/storage/v1${rel.startsWith('/') ? rel : `/${rel}`}`
}

/* ---------------- Types ---------------- */

export type ProductRow = {
  id: string
  slug: string
  name: string
  description: string | null
  details: string[]
  level: string | null
  page_count: number | null
  price_amount: number
  currency: string
  file_path: string | null
  preview_images: string[]
  active: boolean
  sort: number
}

export type OrderRow = {
  id: string
  stripe_session_id: string
  email: string | null
  status: 'pending' | 'paid' | 'failed' | 'expired'
  amount_total: number | null
  currency: string | null
  product_ids: string[]
  consent_digital: boolean
  email_sent_at: string | null
  paid_at: string | null
}

/* ---------------- Tokens ---------------- */

export async function sha256(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const formatPrice = (amount: number, currency = 'pln') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
