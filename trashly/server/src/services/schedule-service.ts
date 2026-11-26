import { createHash, randomUUID } from "node:crypto";
import { backoffDelay } from "../lib/http.ts";
import { isValidIsoDate, todayWarsaw } from "../lib/dates.ts";
import { CITIES, getCity } from "../providers/cities.ts";
import type { ScheduleProvider } from "../providers/provider.ts";
import type { Store, NotificationPrefs } from "../store/store.ts";
import {
  ProviderError,
  type AddressInput, type CollectionEvent, type ProviderSchedule, type ResolvedAddress,
  type ScheduleChange, type ScheduleResponse, type StoredSchedule, type TrustStatus
} from "../domain/types.ts";

export const MSG = {
  UNCONFIRMED: "Adres został rozpoznany, ale nie udało nam się potwierdzić harmonogramu odbioru odpadów dla tej lokalizacji.",
  UNAVAILABLE: "Nie udało się teraz pobrać aktualnych danych.",
  STALE: "Harmonogram może być nieaktualny – nie udało się go ostatnio potwierdzić w oficjalnym źródle.",
  VERIFIED: "Harmonogram potwierdzony w oficjalnym źródle.",
  UPDATED: "Termin odbioru został zmieniony. Dane zaktualizowano z oficjalnego źródła."
};

const MIN_MANUAL_REFRESH_MS = 2 * 60_000;

// ---------- czyste funkcje (testowane jednostkowo) ----------

/** Walidacja i normalizacja wyniku providera. Odrzuca dane, zamiast je „naprawiać”. */
export function validateSchedule(ps: ProviderSchedule, today: string): ProviderSchedule {
  const seen = new Set<string>();
  const events: CollectionEvent[] = [];
  for (const e of ps.events) {
    if (!isValidIsoDate(e.date)) throw new ProviderError("VALIDATION_FAILED", `Nieprawidłowa data „${e.date}”.`);
    const k = e.date + "|" + e.category;
    if (seen.has(k)) continue;                      // duplikaty z różnych wierszy/tabel – zapisujemy raz
    seen.add(k);
    events.push(e);
  }
  const year = Number(today.slice(0, 4));
  if (events.some(e => Number(e.date.slice(0, 4)) > year + 1 || Number(e.date.slice(0, 4)) < year - 1)) {
    throw new ProviderError("VALIDATION_FAILED", "Harmonogram zawiera daty spoza oczekiwanego zakresu lat.");
  }
  if (events.length === 0 && ps.onDemand.length === 0) throw new ProviderError("VALIDATION_FAILED", "Źródło nie zwróciło żadnych terminów.");
  events.sort((a, b) => a.date.localeCompare(b.date) || a.category.localeCompare(b.category));
  return { ...ps, events };
}

export function hashEvents(events: CollectionEvent[], onDemand: string[]): string {
  const canon = JSON.stringify({ e: events.map(e => [e.date, e.category]), d: [...onDemand].sort() });
  return createHash("sha256").update(canon).digest("hex");
}

/**
 * Wykrywa zmiany terminów między wersjami. Porównujemy tylko przyszłe terminy w okresie,
 * który obejmowały OBIE wersje – nowy rok w harmonogramie to nie „zmiana”, a minione daty
 * znikające z „najbliższego terminu” (Warszawa) to normalny upływ czasu.
 */
export function computeChanges(prev: StoredSchedule, next: ProviderSchedule, today: string, nowIso: string): ScheduleChange[] {
  const changes: ScheduleChange[] = [];
  const cats = new Set([...prev.events, ...next.events].map(e => e.category));
  const within = (d: string, end: string | null) => !end || d <= end;
  for (const cat of cats) {
    const oldD = prev.events.filter(e => e.category === cat && e.date >= today).map(e => e.date);
    const newD = next.events.filter(e => e.category === cat && e.date >= today).map(e => e.date);
    let removed: string[], added: string[];
    if (next.coverage === "NEXT_ONLY" || prev.coverage === "NEXT_ONLY") {
      // Tylko najbliższy termin: zmiana = przyszły termin zastąpiony innym.
      removed = oldD.filter(d => !newD.includes(d));
      added = removed.length ? newD.filter(d => !oldD.includes(d)) : [];
    } else {
      removed = oldD.filter(d => !newD.includes(d) && within(d, next.periodEnd));
      added = newD.filter(d => !oldD.includes(d) && within(d, prev.periodEnd));
    }
    const left = [...added];
    for (const r of removed) {
      // Para „przeniesiono z → na” = najbliższa dodana data w promieniu 14 dni.
      let best = -1, bestDist = 15;
      left.forEach((a, i) => { const dist = Math.abs(Date.parse(a) - Date.parse(r)) / 864e5; if (dist < bestDist) { best = i; bestDist = dist; } });
      if (best >= 0) { changes.push({ category: cat, from: r, to: left[best], detectedAt: nowIso }); left.splice(best, 1); }
      else changes.push({ category: cat, from: r, to: null, detectedAt: nowIso });
    }
    for (const a of left) changes.push({ category: cat, from: null, to: a, detectedAt: nowIso });
  }
  return changes;
}

export function trustStatus(s: StoredSchedule, staleAfterHours: number, now: Date): TrustStatus {
  const age = now.getTime() - Date.parse(s.lastSuccessAt);
  if (age > staleAfterHours * 3600_000) return "STALE";
  if (s.version > 1 && s.lastChangeAt && now.getTime() - Date.parse(s.lastChangeAt) < 7 * 864e5) return "UPDATED";
  return "VERIFIED";
}

// ---------- serwis ----------

export interface ServiceOptions { now?: () => Date; }

export class ScheduleService {
  private providers: Record<string, ScheduleProvider>;
  private store: Store;
  private now: () => Date;
  private inflight = new Map<string, Promise<StoredSchedule>>();

  constructor(providers: Record<string, ScheduleProvider>, store: Store, opts: ServiceOptions = {}) {
    this.providers = providers; this.store = store; this.now = opts.now ?? (() => new Date());
  }

  private provider(cityId: string): ScheduleProvider {
    const p = getCity(cityId) ? this.providers[cityId] : undefined;
    if (!p) throw new ProviderError("NOT_FOUND", "Nieobsługiwane miasto.");
    return p;
  }

  cities() {
    return Object.values(CITIES).map(c => ({
      id: c.id, name: c.name, voivodeship: c.voivodeship, capabilities: c.capabilities,
      officialInfoUrl: c.officialInfoUrl, pszokUrl: c.pszokUrl, rules: c.rules, integrationNote: c.integrationNote
    }));
  }

  suggestStreets(cityId: string, q: string) { return this.provider(cityId).suggestStreets(q); }
  suggestNumbers(cityId: string, street: string, q: string) { return this.provider(cityId).suggestNumbers(street, q); }

  /** Główny przepływ: walidacja adresu → strefa → harmonogram → status. Nigdy nie rzuca dla błędów źródła. */
  async resolve(input: AddressInput, deviceId?: string, prefs?: NotificationPrefs): Promise<ScheduleResponse> {
    const city = getCity(input.city);
    if (!city) throw new ProviderError("NOT_FOUND", "Nieobsługiwane miasto.");
    const p = this.provider(city.id);
    if (city.capabilities.buildingTypeRequired && !input.buildingType) {
      throw new ProviderError("NOT_FOUND", `Wybierz typ zabudowy – w mieście ${city.name} harmonogram zależy od tego, czy to dom jednorodzinny, czy budynek wielorodzinny.`);
    }
    const address = await p.resolve(input);           // NOT_FOUND → 422 z komunikatem dla użytkownika
    let loc;
    try { loc = await p.locate(address); }
    catch (e) { return this.unconfirmed(address, e, p); }
    const key = `${city.id}:${loc.zoneKey}`;
    let stored = await this.store.getSchedule(key);
    if (!stored || Date.parse(stored.nextCheckAt) <= this.now().getTime()) {
      try { stored = await this.refresh(key, { ctx: loc.refreshContext, label: loc.zoneLabel }); }
      catch (e) {
        if (!stored) {
          if (e instanceof ProviderError && (e.code === "VALIDATION_FAILED" || e.code === "NOT_FOUND" || e.code === "NOT_INTEGRATED")) return this.unconfirmed(address, e, p);
          return { status: "UNAVAILABLE", message: `${MSG.UNAVAILABLE} ${(e as Error).message}`, address, schedule: null, officialInfoUrl: city.officialInfoUrl };
        }
        stored = (await this.store.getSchedule(key))!;   // pokazujemy ostatnią potwierdzoną wersję ze statusem
      }
    }
    if (deviceId) {
      await this.store.upsertSubscription({
        deviceId, scheduleKey: key, address, createdAt: this.now().toISOString(),
        prefs: prefs ?? { eveningBefore: true, eveningTime: "19:00", collectionDay: false, morningTime: "06:00", scheduleChanges: true }
      });
    }
    return this.respond(stored, address, p);
  }

  private unconfirmed(address: ResolvedAddress, e: unknown, p: ScheduleProvider): ScheduleResponse {
    const reason = e instanceof Error ? e.message : String(e);
    return { status: "UNCONFIRMED", message: `${MSG.UNCONFIRMED} ${reason}`, address, schedule: null, officialInfoUrl: p.city.officialInfoUrl };
  }

  private respond(s: StoredSchedule, address: ResolvedAddress | null, p: ScheduleProvider): ScheduleResponse {
    const status = trustStatus(s, p.staleAfterHours, this.now());
    const today = todayWarsaw(this.now());
    const { refreshContext: _r, failures: _f, nextCheckAt: _n, ...pub } = s;
    let message = MSG[status as "VERIFIED" | "UPDATED" | "STALE"];
    if (status === "STALE" && s.lastError) message += ` Ostatni błąd: ${s.lastError}`;
    return {
      status, message, address,
      schedule: { ...pub, upcoming: s.events.filter(e => e.date >= today) },
      officialInfoUrl: p.city.officialInfoUrl
    };
  }

  /** Pobiera harmonogram ze źródła, waliduje, wersjonuje i zapisuje. Jedno równoległe odświeżenie na klucz. */
  async refresh(key: string, opts: { ctx?: Record<string, string>; label?: string; force?: boolean } = {}): Promise<StoredSchedule> {
    const running = this.inflight.get(key);
    if (running) return running;
    const job = this.doRefresh(key, opts).finally(() => this.inflight.delete(key));
    this.inflight.set(key, job);
    return job;
  }

  private async doRefresh(key: string, opts: { ctx?: Record<string, string>; label?: string; force?: boolean }): Promise<StoredSchedule> {
    const cityId = key.split(":")[0];
    const p = this.provider(cityId);
    const prev = await this.store.getSchedule(key);
    const ctx = opts.ctx ?? prev?.refreshContext;
    if (!ctx) throw new ProviderError("NOT_FOUND", "Brak danych do odświeżenia harmonogramu.");
    const now = this.now();
    const nowIso = now.toISOString();
    if (opts.force && prev && now.getTime() - Date.parse(prev.lastAttemptAt) < MIN_MANUAL_REFRESH_MS) {
      return prev;   // ochrona źródła przed zbyt częstym ręcznym odświeżaniem
    }
    const started = Date.now();
    try {
      const raw = await p.fetchSchedule(ctx);
      const ps = validateSchedule(raw, todayWarsaw(now));
      const hash = hashEvents(ps.events, ps.onDemand);
      const nextCheckAt = new Date(now.getTime() + p.updateIntervalHours * 3600_000).toISOString();
      if (prev && prev.hash === hash) {
        const s: StoredSchedule = { ...prev, lastSuccessAt: nowIso, lastAttemptAt: nowIso, lastError: null, failures: 0, nextCheckAt, source: ps.source };
        await this.store.putSchedule(s);
        await this.store.addLog({ at: nowIso, cityId, scheduleKey: key, outcome: "UNCHANGED", message: "Harmonogram bez zmian.", durationMs: Date.now() - started });
        return s;
      }
      const changes = prev ? computeChanges(prev, ps, todayWarsaw(now), nowIso) : [];
      const s: StoredSchedule = {
        key, cityId, zoneKey: key.slice(cityId.length + 1), zoneLabel: opts.label ?? prev?.zoneLabel ?? ps.zoneLabel,
        version: (prev?.version ?? 0) + 1, hash, events: ps.events, onDemand: ps.onDemand, source: ps.source,
        coverage: ps.coverage, periodEnd: ps.periodEnd, notes: ps.notes,
        lastSuccessAt: nowIso, lastChangeAt: changes.length ? nowIso : (prev?.lastChangeAt ?? null),
        lastAttemptAt: nowIso, lastError: null, failures: 0, nextCheckAt,
        changes: [...changes, ...(prev?.changes ?? [])].slice(0, 50), refreshContext: ctx
      };
      if (prev) await this.store.addVersion({ scheduleKey: key, version: prev.version, hash: prev.hash, events: prev.events.map(e => ({ date: e.date, category: e.category })), savedAt: nowIso });
      await this.store.putSchedule(s);
      await this.store.addLog({ at: nowIso, cityId, scheduleKey: key, outcome: "NEW_VERSION", message: prev ? `Nowa wersja ${s.version}, zmian: ${changes.length}.` : "Pierwsze pobranie harmonogramu.", durationMs: Date.now() - started });
      if (changes.length) await this.notify(key, changes, nowIso);
      return s;
    } catch (e) {
      const err = e instanceof ProviderError ? e : new ProviderError("SOURCE_UNAVAILABLE", (e as Error).message, true);
      const outcome = err.code === "VALIDATION_FAILED" || err.code === "PARSE_ERROR" ? "REJECTED" : "FAILED";
      await this.store.addLog({ at: nowIso, cityId, scheduleKey: key, outcome, message: err.message, durationMs: Date.now() - started });
      if (prev) {
        const failures = prev.failures + 1;
        // Wykładniczy odstęp: 15 min, 30 min, 1 h … maks. interwał providera.
        const delay = backoffDelay(failures - 1, 15 * 60_000, p.updateIntervalHours * 3600_000);
        await this.store.putSchedule({ ...prev, lastAttemptAt: nowIso, lastError: err.message, failures, nextCheckAt: new Date(now.getTime() + delay).toISOString() });
      }
      throw err;
    }
  }

  private async notify(key: string, changes: ScheduleChange[], nowIso: string) {
    for (const sub of await this.store.listSubscriptions(key)) {
      if (!sub.prefs.scheduleChanges) continue;
      await this.store.addNotification({
        id: randomUUID(), deviceId: sub.deviceId, scheduleKey: key, type: "SCHEDULE_CHANGED",
        title: "Termin odbioru został zmieniony",
        body: "Zaktualizowaliśmy harmonogram na podstawie oficjalnego źródła.",
        changes, createdAt: nowIso, readAt: null
      });
    }
  }

  /** Ręczne odświeżenie z przycisku w aplikacji. */
  async manualRefresh(input: AddressInput): Promise<ScheduleResponse> {
    const p = this.provider(input.city);
    const address = await p.resolve(input);
    let loc;
    try { loc = await p.locate(address); } catch (e) { return this.unconfirmed(address, e, p); }
    const key = `${input.city}:${loc.zoneKey}`;
    try { await this.refresh(key, { ctx: loc.refreshContext, label: loc.zoneLabel, force: true }); }
    catch (e) {
      const s = await this.store.getSchedule(key);
      if (!s) return { status: "UNAVAILABLE", message: `${MSG.UNAVAILABLE} ${(e as Error).message}`, address, schedule: null, officialInfoUrl: p.city.officialInfoUrl };
      const r = this.respond(s, address, p);
      return { ...r, message: `${MSG.UNAVAILABLE} Pokazujemy ostatnią potwierdzoną wersję.` };
    }
    return this.respond((await this.store.getSchedule(key))!, address, p);
  }

  /** Job: odświeża harmonogramy, którym minął termin sprawdzenia, i monitoruje źródła PDF. */
  async runDueUpdates(): Promise<{ checked: number; updated: number; failed: number; sourceChanges: number }> {
    const now = this.now().getTime();
    let checked = 0, updated = 0, failed = 0, sourceChanges = 0;
    for (const s of await this.store.listSchedules()) {
      if (Date.parse(s.nextCheckAt) > now) continue;
      checked++;
      try { const r = await this.refresh(s.key); if (r.version !== s.version) updated++; }
      catch { failed++; }
    }
    for (const p of Object.values(this.providers)) {
      try { if (await this.checkSources(p)) sourceChanges++; } catch { /* zalogowane w checkSources */ }
    }
    return { checked, updated, failed, sourceChanges };
  }

  /** Monitoring listy oficjalnych dokumentów: wykrywa nowe/usunięte pliki na stronie gminy. */
  private async checkSources(p: ScheduleProvider): Promise<boolean> {
    const nowIso = this.now().toISOString();
    const started = Date.now();
    let sources;
    try { sources = await p.listSources(); }
    catch (e) {
      await this.store.addLog({ at: nowIso, cityId: p.city.id, scheduleKey: null, outcome: "FAILED", message: `Źródło niedostępne: ${(e as Error).message}`, durationMs: Date.now() - started });
      throw e;
    }
    const url = `listing:${p.city.id}`;
    const hash = createHash("sha256").update(sources.map(s => s.url).sort().join("\n")).digest("hex");
    const prev = await this.store.getDocument(url);
    if (prev?.sha256 === hash) return false;
    await this.store.putDocument({ url, cityId: p.city.id, sha256: hash, fetchedAt: nowIso, firstSeenAt: nowIso, parsed: sources, parseErrors: [] });
    if (prev) {
      await this.store.addLog({ at: nowIso, cityId: p.city.id, scheduleKey: null, outcome: "SOURCE_CHANGED", message: `Zmieniła się lista oficjalnych dokumentów (${sources.length}).`, durationMs: Date.now() - started });
      return true;
    }
    return false;
  }

  async sources(cityId: string) { return this.provider(cityId).listSources(); }
  async notifications(deviceId: string) { return this.store.listNotifications(deviceId); }
}
