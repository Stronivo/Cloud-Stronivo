import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpClient } from "../lib/http.ts";
import { fold, isValidBuildingNumber } from "../lib/text.ts";
import { createProviders } from "../providers/index.ts";
import { ScheduleService } from "../services/schedule-service.ts";
import { createStore } from "../store/factory.ts";
import { ProviderError, type AddressInput } from "../domain/types.ts";
import { CATEGORIES } from "../domain/categories.ts";
import type { NotificationPrefs } from "../store/store.ts";

// Serwer API Trashly + statyczny frontend (../../index.html).
// Uruchomienie: node src/http/server.ts  (PORT=8787, TRASHLY_SCHEDULER=1 włącza job w procesie)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");   // katalog trashly/
const GUIDE = JSON.parse(readFileSync(join(ROOT, "server/data/guide.json"), "utf8"));

// ---------- limit zapytań (token bucket per IP) ----------
const buckets = new Map<string, { tokens: number; at: number }>();
function allow(key: string, perMinute: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: perMinute, at: now };
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60_000) * perMinute);
  b.at = now;
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1; buckets.set(key, b);
  return true;
}

// ---------- walidacja wejścia ----------
const SAFE = /^[\p{L}\p{N} .,'’\-/()]*$/u;
function str(v: unknown, max: number, name: string, required = true): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s && required) throw new HttpError(400, `Brak pola: ${name}.`);
  if (s.length > max || !SAFE.test(s)) throw new HttpError(400, `Nieprawidłowa wartość pola: ${name}.`);
  return s;
}
function deviceId(v: unknown): string | undefined {
  return typeof v === "string" && /^[a-zA-Z0-9-]{16,64}$/.test(v) ? v : undefined;
}
function addressFrom(body: Record<string, unknown>): AddressInput {
  const number = str(body.number, 16, "numer budynku", false);
  if (number && !isValidBuildingNumber(number)) throw new HttpError(400, "Nieprawidłowy format numeru budynku (np. 12, 12A, 5/7).");
  return {
    city: str(body.city, 32, "miasto"),
    street: str(body.street, 120, "ulica"),
    number,
    apartment: str(body.apartment, 10, "numer lokalu", false) || undefined,
    buildingType: body.buildingType === "SINGLE" || body.buildingType === "MULTI" ? body.buildingType : undefined
  };
}
function prefsFrom(v: unknown): NotificationPrefs | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const t = (x: unknown, d: string) => typeof x === "string" && /^\d{2}:\d{2}$/.test(x) ? x : d;
  return { eveningBefore: o.eveningBefore !== false, eveningTime: t(o.eveningTime, "19:00"), collectionDay: o.collectionDay === true, morningTime: t(o.morningTime, "06:00"), scheduleChanges: o.scheduleChanges !== false };
}

class HttpError extends Error { status: number; constructor(status: number, msg: string) { super(msg); this.status = status; } }

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const c of req) { size += (c as Buffer).length; if (size > 16_384) throw new HttpError(413, "Zbyt duże zapytanie."); chunks.push(c as Buffer); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { throw new HttpError(400, "Nieprawidłowy JSON."); }
}

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
  res.end(JSON.stringify(body));
}

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
function serveStatic(path: string, res: ServerResponse) {
  const rel = path === "/" ? "index.html" : path.replace(/^\/+/, "");
  if (!(rel === "index.html" || rel.startsWith("assets/"))) return false;
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) return false;
  res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream", "Cache-Control": rel === "index.html" ? "no-cache" : "public, max-age=86400", "X-Content-Type-Options": "nosniff" });
  res.end(readFileSync(file));
  return true;
}

export function createApp(service: ScheduleService) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() || req.socket.remoteAddress || "?";
    try {
      if (!url.pathname.startsWith("/api/")) {
        if (req.method === "GET" && serveStatic(url.pathname, res)) return;
        return send(res, 404, { error: "Nie znaleziono." });
      }
      if (!allow(ip, 90)) return send(res, 429, { error: "Zbyt wiele zapytań. Spróbuj za chwilę." }, { "Retry-After": "30" });
      const q = url.searchParams;
      switch (`${req.method} ${url.pathname}`) {
        case "GET /api/health": return send(res, 200, { ok: true });
        case "GET /api/cities": return send(res, 200, { cities: service.cities(), categories: CATEGORIES });
        case "GET /api/streets": {
          const city = str(q.get("city"), 32, "miasto"), text = str(q.get("q"), 80, "q", false);
          return send(res, 200, { streets: await service.suggestStreets(city, text) });
        }
        case "GET /api/numbers": {
          const city = str(q.get("city"), 32, "miasto"), street = str(q.get("street"), 120, "ulica"), text = str(q.get("q"), 16, "q", false);
          return send(res, 200, { numbers: await service.suggestNumbers(city, street, text) });
        }
        case "POST /api/resolve": {
          const body = await readJson(req);
          return send(res, 200, await service.resolve(addressFrom(body), deviceId(body.deviceId), prefsFrom(body.prefs)));
        }
        case "POST /api/refresh": {
          if (!allow("refresh:" + ip, 6)) return send(res, 429, { error: "Odświeżasz zbyt często. Spróbuj za kilka minut." }, { "Retry-After": "120" });
          return send(res, 200, await service.manualRefresh(addressFrom(await readJson(req))));
        }
        case "GET /api/sources": return send(res, 200, { sources: await service.sources(str(q.get("city"), 32, "miasto")) });
        case "GET /api/notifications": {
          const id = deviceId(q.get("deviceId"));
          if (!id) throw new HttpError(400, "Nieprawidłowy identyfikator urządzenia.");
          return send(res, 200, { notifications: await service.notifications(id) });
        }
        case "GET /api/guide": {
          const text = fold(str(q.get("q"), 80, "q", false));
          const items = text ? GUIDE.items.filter((it: { name: string; keywords: string }) => text.split(" ").every(w => fold(it.name + " " + it.keywords).includes(w))) : GUIDE.items;
          return send(res, 200, { basis: GUIDE.basis, items }, { "Cache-Control": "public, max-age=3600" });
        }
        default: return send(res, 404, { error: "Nieznany endpoint." });
      }
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message });
      if (e instanceof ProviderError) {
        const status = e.code === "NOT_FOUND" ? 422 : e.code === "RATE_LIMITED" ? 503 : 502;
        return send(res, status, { error: e.message, code: e.code });
      }
      console.error("[trashly] nieoczekiwany błąd:", e);
      return send(res, 500, { error: "Wystąpił nieoczekiwany błąd serwera." });
    }
  };
}

// Start, gdy plik uruchomiony bezpośrednio.
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const store = createStore();
  const service = new ScheduleService(createProviders({ http: new HttpClient(), store }), store);
  const port = Number(process.env.PORT ?? 8787);
  createServer(createApp(service)).listen(port, () => console.log(`Trashly: http://localhost:${port}`));
  if (process.env.TRASHLY_SCHEDULER === "1") {
    const every = Number(process.env.TRASHLY_SCHEDULER_MINUTES ?? 15) * 60_000;
    const tick = () => service.runDueUpdates().then(r => console.log("[trashly] aktualizacja:", r)).catch(e => console.error("[trashly] job:", e));
    setInterval(tick, every);
    tick();
  }
}
