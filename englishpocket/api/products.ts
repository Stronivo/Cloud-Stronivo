/**
 * GET /api/products — public catalogue straight from Supabase.
 * Returns only what the storefront needs; file paths never leave the server.
 * If the database is not configured it answers 503 and the UI shows products
 * without prices and with the purchase button disabled (no invented prices).
 */
import { db, hasSupabase, json, type ProductRow } from './_lib/server.ts'

export async function GET(): Promise<Response> {
  if (!hasSupabase()) return json({ ok: false, error: 'not_configured' }, 503)
  try {
    const rows = await db.select<ProductRow>(
      'products',
      'select=id,slug,name,description,details,level,page_count,price_amount,currency,preview_images,file_path&active=eq.true&order=sort.asc',
    )
    const products = rows.map(({ file_path, ...p }) => ({ ...p, available: Boolean(file_path) }))
    return json({ ok: true, products }, 200, { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' })
  } catch (e) {
    console.error(e)
    return json({ ok: false, error: 'db_error' }, 502)
  }
}
