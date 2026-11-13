/**
 * GET /api/download?token=...
 * Checks the token (hash, expiry, download limit) atomically in the database,
 * then redirects to a 60-second signed URL of the PDF in the private bucket.
 */
import { db, hasSupabase, sha256, signedFileUrl } from './_lib/server.ts'

const page = (title: string, body: string, status: number) =>
  new Response(
    `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — EnglishPocket</title>` +
      `<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FAF7F0;color:#17243A;font:16px/1.6 system-ui,sans-serif;padding:24px">` +
      `<main style="max-width:440px;text-align:center"><h1 style="font-size:28px;margin:0 0 12px">${title}</h1><p style="color:#667085;margin:0 0 24px">${body}</p>` +
      `<a href="/" style="display:inline-block;background:#4978FF;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Wróć na stronę główną</a></main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
  )

export async function GET(request: Request): Promise<Response> {
  if (!hasSupabase()) return page('Pobieranie niedostępne', 'Sklep nie jest jeszcze skonfigurowany.', 503)
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) return page('Nieprawidłowy link', 'Ten link do pobrania jest niepoprawny.', 400)

  try {
    const rows = await db.rpc<{ file_path: string | null; product_name: string }[]>('consume_download', {
      p_token_hash: await sha256(token),
    })
    const hit = rows?.[0]
    if (!hit?.file_path) {
      return page('Link wygasł', 'Ten link wygasł albo wykorzystano już limit pobrań. Napisz do nas, a pomożemy.', 410)
    }
    const url = await signedFileUrl(hit.file_path, 60)
    return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch (e) {
    console.error(e)
    return page('Coś poszło nie tak', 'Nie udało się przygotować pliku. Spróbuj ponownie za chwilę.', 502)
  }
}
