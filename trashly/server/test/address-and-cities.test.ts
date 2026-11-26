import { test } from "node:test";
import assert from "node:assert/strict";
import { PrgRegistry } from "../src/address/prg.ts";
import { CITIES } from "../src/providers/cities.ts";
import { createProviders } from "../src/providers/index.ts";
import { FileStore } from "../src/store/file-store.ts";
import { ScheduleService } from "../src/services/schedule-service.ts";
import { mockHttp, uug, zoryBbox } from "./helpers.ts";

const ZORY_LISTING = `<a href="/fileadmin/user-files/dla-mieszkancow/gospodarka-odpadami/harmonogramy/HARMONOGRAMY_2026/wszystkie_rejony_01_07.pdf">Harmonogram 2026</a>`;

/** Mock wszystkich źródeł; PRG zna tylko wskazane adresy. */
function world(prg: Record<string, Record<string, string>[]>) {
  return mockHttp((url) => {
    if (url.startsWith("https://services.gugik.gov.pl/uug/")) {
      const q = decodeURIComponent(new URL(url).searchParams.get("address") ?? "");
      const hit = prg[q];
      return { body: uug(/\d/.test(q.split(",")[1] ?? "") ? "address" : "street", hit ?? []) };
    }
    if (url === CITIES.zory.officialInfoUrl) return { body: ZORY_LISTING };
    if (url.endsWith(".pdf")) return { body: new TextEncoder().encode("%PDF-1.7 test") };
    if (url === CITIES.rybnik.officialInfoUrl || url === CITIES.jastrzebie.officialInfoUrl) return { body: "<html></html>" };
    return { status: 404, body: "" };
  });
}

const zoryAddr = { street: "Wodzisławska", number: "72", teryt: "2479011", simc: "0945746", ulic: "24316", code: "44-240", x: "1", y: "2" };
const rybnikAddr = { ...zoryAddr, teryt: "2473011", simc: "0942765", code: "44-200" };

test("PRG: wynik z innej gminy (inny TERYT) jest odrzucany", async () => {
  const { http } = world({ "Żory, Wodzisławska 72": [rybnikAddr] });
  const reg = new PrgRegistry(http);
  assert.equal(await reg.findAddress(CITIES.zory, "Wodzisławska", "72"), null);
});

test("PRG: rozmyte dopasowanie innej ulicy lub numeru jest odrzucane", async () => {
  const { http } = world({
    "Warszawa, Krucza 10": [{ street: "ulica Krupnicza", number: "10", teryt: "146501", simc: "1", ulic: "1", x: "1", y: "1" }],
    "Żory, Wodzisławska 7": [{ ...zoryAddr, number: "72" }]
  });
  const reg = new PrgRegistry(http);
  assert.equal(await reg.findAddress(CITIES.warszawa, "Krucza", "10"), null);
  assert.equal(await reg.findAddress(CITIES.zory, "Wodzisławska", "7"), null);
});

test("PRG: dokładny adres w gminie jest akceptowany", async () => {
  const { http } = world({ "Żory, Wodzisławska 72": [zoryAddr] });
  const a = await new PrgRegistry(http).findAddress(CITIES.zory, "Wodzisławska", "72");
  assert.equal(a?.number, "72");
  assert.equal(a?.postalCode, "44-240");
});

test("Separacja miast: ta sama ulica w Żorach i Rybniku daje różne wyniki, nigdy harmonogram innej gminy", async () => {
  const { http } = world({
    "Żory, Wodzisławska 72": [zoryAddr],
    "Rybnik, Wodzisławska": [{ street: "Wodzisławska", teryt: "247301", simc: "0942765", ulic: "24316" }],
    "Rybnik, Wodzisławska 72": [rybnikAddr]
  });
  const store = new FileStore(null);
  const providers = createProviders({ http, store, pdfToText: async () => zoryBbox(), now: () => new Date("2026-11-26T10:00:00Z") });
  const svc = new ScheduleService(providers, store, { now: () => new Date("2026-11-26T10:00:00Z") });

  const z = await svc.resolve({ city: "zory", street: "Wodzisławska", number: "72", buildingType: "SINGLE" });
  assert.equal(z.status, "VERIFIED");
  assert.equal(z.address?.cityId, "zory");
  assert.ok(z.schedule?.key.startsWith("zory:"));
  assert.equal(z.address?.level, "BUILDING_VERIFIED");

  const r = await svc.resolve({ city: "rybnik", street: "Wodzisławska", number: "72" });
  assert.equal(r.status, "UNCONFIRMED");
  assert.equal(r.schedule, null, "Rybnik nie może dostać harmonogramu Żor");
  assert.equal(r.address?.cityId, "rybnik");
  assert.match(r.message, /^Adres został rozpoznany, ale nie udało nam się potwierdzić harmonogramu/);

  // Ulica istniejąca tylko w Żorach nie jest akceptowana w Rybniku
  await assert.rejects(svc.resolve({ city: "rybnik", street: "Beskidzka", number: "1" }), /Nie znaleźliśmy ulicy/);
  // Nieobsługiwane miasto
  await assert.rejects(svc.resolve({ city: "krakow", street: "Rynek", number: "1" }), /Nieobsługiwane miasto/);
});

test("Żory: budynek nieistniejący w PRG jest odrzucany, a bez PRG nie udajemy weryfikacji budynku", async () => {
  const { http } = world({ "Żory, Wodzisławska": [{ street: "Wodzisławska", teryt: "247901", simc: "1", ulic: "1" }] });
  const store = new FileStore(null);
  const svc = new ScheduleService(createProviders({ http, store, pdfToText: async () => zoryBbox(), now: () => new Date("2026-11-26T10:00:00Z") }), store, { now: () => new Date("2026-11-26T10:00:00Z") });
  await assert.rejects(svc.resolve({ city: "zory", street: "Wodzisławska", number: "9999", buildingType: "SINGLE" }), /PRG/);

  const down = mockHttp((url) => {
    if (url.includes("gugik")) return { status: 503, body: "" };
    if (url === CITIES.zory.officialInfoUrl) return { body: ZORY_LISTING };
    return { body: new TextEncoder().encode("%PDF-1.7") };
  });
  const store2 = new FileStore(null);
  const svc2 = new ScheduleService(createProviders({ http: down.http, store: store2, pdfToText: async () => zoryBbox(), now: () => new Date("2026-11-26T10:00:00Z") }), store2, { now: () => new Date("2026-11-26T10:00:00Z") });
  const r = await svc2.resolve({ city: "zory", street: "Wodzisławska", number: "72", buildingType: "SINGLE" });
  assert.equal(r.address?.level, "STREET_VERIFIED", "bez PRG tylko ulica jest potwierdzona");
  assert.equal(r.status, "VERIFIED");
});

test("Żory: harmonogram z PDF tylko dla zabudowy jednorodzinnej; wielorodzinna → UNCONFIRMED; brak typu → błąd", async () => {
  const { http } = world({ "Żory, Wodzisławska 72": [zoryAddr] });
  const store = new FileStore(null);
  const svc = new ScheduleService(createProviders({ http, store, pdfToText: async () => zoryBbox(), now: () => new Date("2026-11-26T10:00:00Z") }), store, { now: () => new Date("2026-11-26T10:00:00Z") });
  const multi = await svc.resolve({ city: "zory", street: "Wodzisławska", number: "72", buildingType: "MULTI" });
  assert.equal(multi.status, "UNCONFIRMED");
  assert.equal(multi.schedule, null);
  assert.match(multi.message, /wielorodzinnej/);
  await assert.rejects(svc.resolve({ city: "zory", street: "Wodzisławska", number: "72" }), /typ zabudowy/);
  const single = await svc.resolve({ city: "zory", street: "Wodzisławska", number: "72", buildingType: "SINGLE" });
  assert.equal(single.status, "VERIFIED");
});
