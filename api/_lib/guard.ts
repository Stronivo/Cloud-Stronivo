import { allowedOrigins } from './stroniq/config.js'

/** Shared request guards for the public API endpoints. No request content is ever logged. */

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  })

/** Browsers always send Origin on cross-site and POST fetches; reject other sites' pages. */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  return allowedOrigins().includes(origin)
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim()
}

/** Reads a JSON body with a hard size cap (bytes). Returns null when invalid or too large. */
export async function readJson(req: Request, maxBytes: number): Promise<unknown | null> {
  if (!(req.headers.get('content-type') || '').includes('application/json')) return null
  const len = Number(req.headers.get('content-length') || '0')
  if (len > maxBytes) return null
  const text = await req.text()
  if (text.length > maxBytes) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ---------------- rate limiting ----------------
// Fixed-window counters. With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set they are
// shared by every function instance (Upstash REST API, no SDK). Without them each warm
// instance keeps its own counters — a best-effort limit that still stops simple floods.

const memory = new Map<string, { count: number; reset: number }>()

async function upstashIncr(key: string, windowSec: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSec), 'NX'],
      ]),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { result?: unknown }[]
    const n = Number(data?.[0]?.result)
    return Number.isFinite(n) ? n : null
  } catch {
    return null // limiter backend down → fall back to memory
  }
}

/** Returns true when the call is within the limit. */
export async function rateLimit(bucket: string, id: string, limit: number, windowSec: number): Promise<boolean> {
  const windowId = Math.floor(Date.now() / 1000 / windowSec)
  const key = `stroniq:${bucket}:${id}:${windowId}`
  const shared = await upstashIncr(key, windowSec)
  if (shared !== null) return shared <= limit

  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || entry.reset < now) {
    memory.set(key, { count: 1, reset: now + windowSec * 1000 })
    if (memory.size > 5000) for (const [k, v] of memory) if (v.reset < now) memory.delete(k)
    return true
  }
  entry.count++
  return entry.count <= limit
}
