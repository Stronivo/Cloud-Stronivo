import { ProviderError } from "../domain/types.ts";

// Klient HTTP dla providerów: timeout, ponowienia z wykładniczym odstępem,
// minimalny odstęp między zapytaniami do jednego hosta i prosty cache w pamięci.
// Nie omija CAPTCHA, logowania ani zabezpieczeń – przy 401/403/429 przerywa.

export interface HttpRequest {
  url: string;
  method?: "GET" | "POST";
  form?: Record<string, string>;
  headers?: Record<string, string>;
  cacheTtlMs?: number;
}
export interface HttpResponse { status: number; text: string; bytes: Uint8Array; url: string; }
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface HttpClientOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  minHostIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  userAgent?: string;
}

const realSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Opóźnienie dla n-tej próby: base * 2^n, z limitem. Eksportowane do testów i joba. */
export function backoffDelay(attempt: number, baseMs: number, capMs = 6 * 3600_000): number {
  return Math.min(capMs, baseMs * 2 ** attempt);
}

export class HttpClient {
  private opts: Required<HttpClientOptions>;
  private lastHit = new Map<string, number>();
  private queue = new Map<string, Promise<unknown>>();
  private cache = new Map<string, { at: number; res: HttpResponse }>();

  constructor(opts: HttpClientOptions = {}) {
    this.opts = {
      fetchImpl: opts.fetchImpl ?? ((u, i) => fetch(u, i)),
      timeoutMs: opts.timeoutMs ?? 20_000,
      retries: opts.retries ?? 3,
      baseDelayMs: opts.baseDelayMs ?? 1_000,
      minHostIntervalMs: opts.minHostIntervalMs ?? 1_000,
      sleep: opts.sleep ?? realSleep,
      userAgent: opts.userAgent ?? "Trashly/1.0 (waste-collection-calendar)"
    };
  }

  async request(req: HttpRequest): Promise<HttpResponse> {
    const method = req.method ?? (req.form ? "POST" : "GET");
    const body = req.form ? new URLSearchParams(req.form).toString() : undefined;
    const cacheKey = `${method} ${req.url} ${body ?? ""}`;
    if (req.cacheTtlMs) {
      const hit = this.cache.get(cacheKey);
      if (hit && Date.now() - hit.at < req.cacheTtlMs) return hit.res;
    }
    const host = new URL(req.url).host;
    // Zapytania do jednego hosta idą po kolei (kolejka per host).
    const prev = this.queue.get(host) ?? Promise.resolve();
    const run = prev.catch(() => {}).then(() => this.withRetries(req, method, body, host));
    this.queue.set(host, run);
    const res = await run;
    if (req.cacheTtlMs) this.cache.set(cacheKey, { at: Date.now(), res });
    return res;
  }

  private async withRetries(req: HttpRequest, method: string, body: string | undefined, host: string): Promise<HttpResponse> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.opts.retries; attempt++) {
      const wait = (this.lastHit.get(host) ?? 0) + this.opts.minHostIntervalMs - Date.now();
      if (wait > 0) await this.opts.sleep(wait);
      this.lastHit.set(host, Date.now());
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), this.opts.timeoutMs);
        let res: Response;
        try {
          res = await this.opts.fetchImpl(req.url, {
            method,
            body,
            signal: ctrl.signal,
            headers: {
              "User-Agent": this.opts.userAgent,
              "Accept-Language": "pl-PL,pl;q=0.9",
              ...(body ? { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } : {}),
              ...req.headers
            }
          });
        } finally { clearTimeout(t); }
        if (res.status === 429) throw new ProviderError("RATE_LIMITED", `Źródło ${host} ogranicza liczbę zapytań (429).`, true);
        if (res.status === 401 || res.status === 403) {
          // Nie próbujemy obchodzić zabezpieczeń.
          throw new ProviderError("SOURCE_UNAVAILABLE", `Źródło ${host} odmówiło dostępu (${res.status}).`, false);
        }
        if (res.status >= 500) throw new ProviderError("SOURCE_UNAVAILABLE", `Źródło ${host} zwróciło błąd ${res.status}.`, true);
        if (res.status === 404) throw new ProviderError("NOT_FOUND", `Nie znaleziono zasobu ${req.url}.`, false);
        const bytes = new Uint8Array(await res.arrayBuffer());
        return { status: res.status, bytes, text: new TextDecoder("utf-8").decode(bytes), url: res.url || req.url };
      } catch (e) {
        lastErr = e instanceof ProviderError ? e
          : new ProviderError("SOURCE_UNAVAILABLE", `Brak połączenia ze źródłem ${host}: ${(e as Error).message}`, true);
        if (!(lastErr as ProviderError).retryable || attempt === this.opts.retries) break;
        await this.opts.sleep(backoffDelay(attempt, this.opts.baseDelayMs, 60_000));
      }
    }
    throw lastErr;
  }
}
