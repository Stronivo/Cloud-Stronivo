import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWawFullName, parseWawSchedule, WarszawaProvider } from "../src/providers/warszawa.ts";
import { parsePoznanSchedule, PoznanProvider } from "../src/providers/poznan.ts";
import { ProviderError } from "../src/domain/types.ts";
import { fixture, mockHttp } from "./helpers.ts";

test("Warszawa: parsowanie adresu z wyszukiwarki", () => {
  assert.deepEqual(parseWawFullName("MARSZAŁKOWSKA 84/92 00-514 Śródmieście", "27044650"),
    { street: "Marszałkowska", number: "84/92", postalCode: "00-514", district: "Śródmieście", id: "27044650", full: "MARSZAŁKOWSKA 84/92 00-514 Śródmieście" });
  assert.equal(parseWawFullName("BEZ NUMERU", "1"), null);
});

test("Warszawa: harmonogram z prawdziwej odpowiedzi źródła", () => {
  const s = parseWawSchedule(JSON.parse(fixture("warszawa-schedule.json")), "27044650");
  assert.equal(s.coverage, "NEXT_ONLY");
  assert.deepEqual(s.events.map(e => [e.date, e.category]).sort(), [
    ["2026-11-26", "bio"], ["2026-11-26", "papier"], ["2026-11-26", "plastik"], ["2026-11-26", "zmieszane"], ["2026-11-30", "szklo"]
  ]);
  assert.deepEqual(s.onDemand.sort(), ["gabaryty", "zielone"], "1900-01-01 = na zgłoszenie, nie data");
});

test("Warszawa: nieznana frakcja i zła data są odrzucane", () => {
  const bad = [{ harmonogramyZ: [{ data: "2026-11-31", frakcja: { id_frakcja: "ZM", nazwa: "zmieszane" } }] }];
  assert.throws(() => parseWawSchedule(bad, "1"), (e: ProviderError) => e.code === "VALIDATION_FAILED");
  const unk = [{ harmonogramyZ: [{ data: "2026-11-30", frakcja: { id_frakcja: "XX", nazwa: "tajemnicza frakcja" } }] }];
  assert.throws(() => parseWawSchedule(unk, "1"), /Nieznana frakcja/);
});

test("Warszawa: budynek musi istnieć w rejestrze punktów adresowych (Krucza 10 ≠ Krupnicza 10)", async () => {
  const { http } = mockHttp((_u, body) => {
    const name = decodeURIComponent(new URLSearchParams(body).values().next().value ?? "");
    if (/krucza/i.test(name)) return { body: JSON.stringify([{ fullName: "KRUCZA 3 00-548 Śródmieście", addressPointId: "1" }]) };
    return { body: "[]" };
  });
  const p = new WarszawaProvider(http);
  await assert.rejects(p.resolve({ city: "warszawa", street: "Krucza", number: "10" }), /budynku 10/);
  const ok = await p.resolve({ city: "warszawa", street: "Krucza", number: "3" });
  assert.equal(ok.level, "BUILDING_VERIFIED");
  assert.equal(ok.ids.providerId, "1");
});

test("Poznań: harmonogram roczny z prawdziwej tabeli poznan.pl", () => {
  const s = parsePoznanSchedule(fixture("poznan-schedule.html"), "glogowska|10", "Głogowska 10");
  const zm = s.events.filter(e => e.category === "zmieszane").map(e => e.date);
  assert.deepEqual(zm.slice(0, 5), ["2026-01-02", "2026-01-09", "2026-01-15", "2026-01-22", "2026-01-29"]);
  assert.deepEqual(s.events.filter(e => e.category === "szklo").map(e => e.date).slice(-2), ["2026-12-02", "2026-12-30"]);
  assert.equal(s.periodEnd, "2026-12-31");
  assert.ok(!s.events.some(e => e.category === "gabaryty"), "wiersze bez terminów pomijamy");
});

test("Poznań: brak tabeli = nie znaleziono; różne tabele pod jednym adresem = niejednoznaczne", () => {
  assert.throws(() => parsePoznanSchedule("<html>Brak wyników</html>", "x", "x"), (e: ProviderError) => e.code === "NOT_FOUND");
  const t = fixture("poznan-schedule.html");
  const t2 = t.replace('id="schedule_0"', 'id="schedule_1"').replace(">02, 09, 15, 22, 29<", ">05, 12<");
  assert.throws(() => parsePoznanSchedule(t + t2, "x", "x"), /kilka różnych harmonogramów/);
});

test("Poznań: ulica i numer muszą istnieć w systemie miasta", async () => {
  const { http } = mockHttp((url, body) => {
    const p = new URLSearchParams(body);
    if (url.includes("street_lookup")) return { body: /g.ogow/i.test(p.get("ws_street") ?? "") ? "<ul><li>GŁOGOWSKA</li></ul>" : "<ul><li>Brak wyników</li></ul>" };
    if (url.includes("number_lookup")) return { body: p.get("ws_number") === "10" ? "<ul><li>10</li><li>101</li></ul>" : "<ul></ul>" };
    return { body: "{}" };
  });
  const prov = new PoznanProvider(http, null);
  await assert.rejects(prov.resolve({ city: "poznan", street: "Nieznana", number: "1" }), /Nie znaleźliśmy ulicy/);
  await assert.rejects(prov.resolve({ city: "poznan", street: "Głogowska", number: "9999" }), /budynku 9999/);
  const a = await prov.resolve({ city: "poznan", street: "Glogowska", number: "10" });
  assert.equal(a.street, "Głogowska");
  assert.equal(a.level, "BUILDING_VERIFIED");
});
