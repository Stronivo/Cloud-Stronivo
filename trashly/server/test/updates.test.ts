import { test } from "node:test";
import assert from "node:assert/strict";
import { FileStore } from "../src/store/file-store.ts";
import { ScheduleService, computeChanges, trustStatus, validateSchedule, MSG } from "../src/services/schedule-service.ts";
import { CITIES } from "../src/providers/cities.ts";
import { ProviderError, type CollectionEvent, type ProviderSchedule, type StoredSchedule } from "../src/domain/types.ts";
import type { ScheduleProvider } from "../src/providers/provider.ts";
import { backoffDelay, HttpClient } from "../src/lib/http.ts";

// Provider testowy – sterujemy tym, co „zwraca źródło”.
function fakeProvider(state: { events: CollectionEvent[]; fail?: ProviderError | null; calls: number }): ScheduleProvider {
  return {
    city: CITIES.poznan, updateIntervalHours: 24, staleAfterHours: 72,
    suggestStreets: async () => [], suggestNumbers: async () => null, listSources: async () => [],
    resolve: async (i) => ({ cityId: "poznan", street: i.street, number: i.number, apartment: null, level: "BUILDING_VERIFIED", ids: {}, verifiedBy: ["test"] }),
    locate: async (a) => ({ zoneKey: `z-${a.street}`, zoneLabel: a.street, refreshContext: { s: a.street } }),
    fetchSchedule: async (): Promise<ProviderSchedule> => {
      state.calls++;
      if (state.fail) throw state.fail;
      return { zoneKey: "z", zoneLabel: "z", events: state.events, onDemand: [], source: { url: "https://www.poznan.pl/x", type: "HTML", title: "t" }, coverage: "FULL_PERIOD", periodEnd: "2026-12-31", notes: [] };
    }
  };
}
const ev = (date: string, category: CollectionEvent["category"] = "zmieszane"): CollectionEvent => ({ date, category, rawName: category });

function setup(events: CollectionEvent[]) {
  let now = new Date("2026-11-26T08:00:00Z");
  const state = { events, fail: null as ProviderError | null, calls: 0 };
  const store = new FileStore(null);
  const svc = new ScheduleService({ poznan: fakeProvider(state) }, store, { now: () => now });
  return { svc, store, state, tick: (h: number) => { now = new Date(now.getTime() + h * 3600_000); } };
}
const addr = { city: "poznan", street: "Testowa", number: "1" };

test("Pierwsze pobranie: wersja 1, VERIFIED, prawdziwy znacznik czasu, tylko przyszłe terminy w upcoming", async () => {
  const { svc } = setup([ev("2026-11-20"), ev("2026-11-27"), ev("2026-12-04")]);
  const r = await svc.resolve(addr);
  assert.equal(r.status, "VERIFIED");
  assert.equal(r.message, MSG.VERIFIED);
  assert.equal(r.schedule?.version, 1);
  assert.equal(r.schedule?.lastSuccessAt, "2026-11-26T08:00:00.000Z");
  assert.deepEqual(r.schedule?.upcoming.map(e => e.date), ["2026-11-27", "2026-12-04"]);
});

test("Duplikaty: te same dane nie tworzą nowej wersji; zduplikowane terminy zapisane raz", async () => {
  const { svc, store, state, tick } = setup([ev("2026-11-27"), ev("2026-11-27"), ev("2026-12-04")]);
  const r1 = await svc.resolve(addr);
  assert.equal(r1.schedule?.events.length, 2);
  tick(25);
  const r2 = await svc.resolve(addr);
  assert.equal(state.calls, 2);
  assert.equal(r2.schedule?.version, 1);
  assert.equal((await store.listVersions(r2.schedule!.key)).length, 0);
});

test("Zmiana terminu: nowa wersja, historia, UPDATED, powiadomienie dla subskrybenta", async () => {
  const { svc, store, state, tick } = setup([ev("2026-11-27"), ev("2026-12-04")]);
  await svc.resolve(addr, "device-0000000000000001");
  tick(25);
  state.events = [ev("2026-11-27"), ev("2026-12-05")];   // 4.12 → 5.12
  const r = await svc.resolve(addr);
  assert.equal(r.status, "UPDATED");
  assert.equal(r.schedule?.version, 2);
  assert.deepEqual(r.schedule?.changes.map(c => [c.from, c.to]), [["2026-12-04", "2026-12-05"]]);
  const hist = await store.listVersions(r.schedule!.key);
  assert.equal(hist.length, 1);
  assert.equal(hist[0].version, 1);
  const notes = await store.listNotifications("device-0000000000000001");
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, "Termin odbioru został zmieniony");
});

test("Niezwalidowane dane nie nadpisują harmonogramu i nie wysyłają powiadomień", async () => {
  const { svc, store, state, tick } = setup([ev("2026-11-27"), ev("2026-12-04")]);
  await svc.resolve(addr, "device-0000000000000002");
  tick(25);
  state.events = [ev("2026-12-32")];                       // nieistniejąca data
  const r = await svc.resolve(addr);
  assert.equal(r.schedule?.version, 1, "zostaje ostatnia poprawna wersja");
  assert.deepEqual(await store.listNotifications("device-0000000000000002"), []);
  const logs = await store.listLogs(5);
  assert.equal(logs[0].outcome, "REJECTED");
});

test("Awaria źródła: brak danych → UNAVAILABLE bez wyjątku; z danymi → ostatnia wersja, potem STALE", async () => {
  const { svc, state, tick } = setup([ev("2026-11-27"), ev("2026-12-04")]);
  state.fail = new ProviderError("SOURCE_UNAVAILABLE", "Źródło niedostępne (503).", true);
  const r0 = await svc.resolve(addr);
  assert.equal(r0.status, "UNAVAILABLE");
  assert.equal(r0.schedule, null);

  state.fail = null;
  await svc.resolve(addr);
  state.fail = new ProviderError("SOURCE_UNAVAILABLE", "Źródło niedostępne (503).", true);
  tick(25);
  const r1 = await svc.resolve(addr);
  assert.equal(r1.status, "VERIFIED", "dane sprzed 25 h są jeszcze świeże (próg 72 h)");
  tick(24 * 3);
  const r2 = await svc.resolve(addr);
  assert.equal(r2.status, "STALE");
  assert.match(r2.message, /nieaktualny/);
});

test("Wykładniczy odstęp po błędach i brak zapytań przed terminem", async () => {
  const { svc, store, state, tick } = setup([ev("2026-11-27")]);
  const r = await svc.resolve(addr);
  const key = r.schedule!.key;
  state.fail = new ProviderError("SOURCE_UNAVAILABLE", "503", true);
  tick(25);
  await svc.runDueUpdates();
  const s1 = (await store.getSchedule(key))!;
  assert.equal(s1.failures, 1);
  const gap1 = Date.parse(s1.nextCheckAt) - Date.parse(s1.lastAttemptAt);
  tick(gap1 / 3600_000);
  await svc.runDueUpdates();
  const s2 = (await store.getSchedule(key))!;
  const gap2 = Date.parse(s2.nextCheckAt) - Date.parse(s2.lastAttemptAt);
  assert.equal(s2.failures, 2);
  assert.equal(gap2, gap1 * 2);
  const calls = state.calls;
  await svc.runDueUpdates();                                // przed terminem – bez zapytania
  assert.equal(state.calls, calls);
  assert.equal(backoffDelay(0, 1000), 1000);
  assert.equal(backoffDelay(3, 1000), 8000);
  assert.equal(backoffDelay(30, 1000, 5000), 5000);
});

test("Ręczne odświeżanie jest ograniczone (ochrona źródła)", async () => {
  const { svc, state } = setup([ev("2026-11-27")]);
  await svc.resolve(addr);
  await svc.manualRefresh(addr);
  await svc.manualRefresh(addr);
  assert.equal(state.calls, 1, "kolejne odświeżenia w ciągu 2 min nie odpytują źródła");
});

test("computeChanges: nowy rok to nie zmiana; minione daty to nie zmiana; NEXT_ONLY", () => {
  const prev = { events: [ev("2026-12-04"), ev("2026-12-18")], coverage: "FULL_PERIOD", periodEnd: "2026-12-31" } as StoredSchedule;
  const next = { events: [ev("2026-12-04"), ev("2026-12-18"), ev("2027-01-08")], coverage: "FULL_PERIOD", periodEnd: "2027-12-31" } as ProviderSchedule;
  assert.deepEqual(computeChanges(prev, next, "2026-11-26", "t"), []);
  const wPrev = { events: [ev("2026-11-25")], coverage: "NEXT_ONLY", periodEnd: null } as StoredSchedule;
  const wNext = { events: [ev("2026-12-02")], coverage: "NEXT_ONLY", periodEnd: null } as ProviderSchedule;
  assert.deepEqual(computeChanges(wPrev, wNext, "2026-11-26", "t"), [], "termin minął – to nie zmiana");
  const wPrev2 = { events: [ev("2026-11-28")], coverage: "NEXT_ONLY", periodEnd: null } as StoredSchedule;
  const wNext2 = { events: [ev("2026-11-30")], coverage: "NEXT_ONLY", periodEnd: null } as ProviderSchedule;
  assert.deepEqual(computeChanges(wPrev2, wNext2, "2026-11-26", "t").map(c => [c.from, c.to]), [["2026-11-28", "2026-11-30"]]);
});

test("validateSchedule: daty spoza zakresu lat i puste harmonogramy są odrzucane", () => {
  const base = { zoneKey: "z", zoneLabel: "z", onDemand: [], source: { url: "u", type: "API" as const, title: "t" }, coverage: "FULL_PERIOD" as const, periodEnd: null, notes: [] };
  assert.throws(() => validateSchedule({ ...base, events: [ev("2031-01-01")] }, "2026-11-26"), /zakresu lat/);
  assert.throws(() => validateSchedule({ ...base, events: [] }, "2026-11-26"), /żadnych terminów/);
});

test("trustStatus: STALE po progu świeżości", () => {
  const s = { lastSuccessAt: "2026-11-20T00:00:00Z", version: 1, lastChangeAt: null } as StoredSchedule;
  assert.equal(trustStatus(s, 72, new Date("2026-11-22T00:00:00Z")), "VERIFIED");
  assert.equal(trustStatus(s, 72, new Date("2026-11-24T00:00:00Z")), "STALE");
});

test("HttpClient: ponawia 503 z odstępem, nie ponawia 403, zgłasza 429", async () => {
  let n = 0; const sleeps: number[] = [];
  const http = new HttpClient({ minHostIntervalMs: 0, baseDelayMs: 100, retries: 2, sleep: async (ms) => { sleeps.push(ms); },
    fetchImpl: async () => { n++; return new Response("x", { status: n < 3 ? 503 : 200 }); } });
  const r = await http.request({ url: "https://example.org/a" });
  assert.equal(r.text, "x");
  assert.deepEqual(sleeps, [100, 200]);

  let m = 0;
  const h403 = new HttpClient({ minHostIntervalMs: 0, sleep: async () => {}, fetchImpl: async () => { m++; return new Response("", { status: 403 }); } });
  await assert.rejects(h403.request({ url: "https://example.org/b" }), /odmówiło dostępu/);
  assert.equal(m, 1, "403 bez ponowień – nie obchodzimy zabezpieczeń");

  const h429 = new HttpClient({ minHostIntervalMs: 0, retries: 0, sleep: async () => {}, fetchImpl: async () => new Response("", { status: 429 }) });
  await assert.rejects(h429.request({ url: "https://example.org/c" }), (e: ProviderError) => e.code === "RATE_LIMITED");
});
