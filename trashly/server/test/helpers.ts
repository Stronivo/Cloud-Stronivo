import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpClient } from "../src/lib/http.ts";

export const FIX = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
export const fixture = (name: string) => readFileSync(join(FIX, name), "utf8");
export const zoryBbox = () => gunzipSync(readFileSync(join(FIX, "zory-2026.bbox.html.gz"))).toString("utf8");

/** Klient HTTP z podstawionym fetch – testy nie wychodzą do sieci. */
export function mockHttp(handler: (url: string, body: string) => { status?: number; body: string | Uint8Array }) {
  const calls: { url: string; body: string }[] = [];
  const http = new HttpClient({
    minHostIntervalMs: 0, baseDelayMs: 1, sleep: async () => {},
    fetchImpl: async (url, init) => {
      const body = typeof init.body === "string" ? init.body : "";
      calls.push({ url, body });
      const r = handler(url, body);
      return new Response(r.body as BodyInit, { status: r.status ?? 200 });
    }
  });
  return { http, calls };
}

/** Odpowiedź UUG (GUGiK) w formacie usługi. */
export function uug(type: "address" | "street", results: Record<string, string>[]) {
  return JSON.stringify({ type, results: results.length ? Object.fromEntries(results.map((r, i) => [String(i + 1), r])) : null });
}
