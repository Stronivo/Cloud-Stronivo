import { test } from "node:test";
import assert from "node:assert/strict";
import { parseZoryBbox, matchZoryZone, parseStreetList, allStreets } from "../src/providers/zory-parser.ts";
import { zoryBbox } from "./helpers.ts";

const doc = parseZoryBbox(zoryBbox());   // prawdziwy PDF UM Żory 2026 (pdftotext -bbox)
const dates = (label: string, idx: number, cat: string) =>
  doc.zones.filter(z => z.label === label)[idx].events.filter(e => e.category === cat).map(e => e.date);

test("Żory: cały dokument odczytany i zwalidowany", () => {
  assert.equal(doc.year, 2026);
  assert.equal(doc.zones.length, 45);
  assert.deepEqual(doc.warnings, []);
  assert.ok(doc.zones.every(z => z.valid));
});

test("Żory: daty odczytane z właściwych kolumn miesięcy (porównane z PDF)", () => {
  // Rejon 1, Zmieszane: sty 5,26 | lut 16 | mar 9,30 | … | lis 17 | gru 7,28
  const z = dates("Rejon 1", 0, "zmieszane");
  assert.deepEqual(z.slice(0, 4), ["2026-01-05", "2026-01-26", "2026-02-16", "2026-03-09"]);
  assert.ok(z.includes("2026-11-17") && z.includes("2026-12-28"));
  // Sierpień ma trzy terminy: 3, 17, 31
  assert.deepEqual(z.filter(d => d.startsWith("2026-08")), ["2026-08-03", "2026-08-17", "2026-08-31"]);
  // Popiół w Rejonie 1 nie ma terminów w czerwcu–sierpniu
  assert.ok(!dates("Rejon 1", 0, "popiol").some(d => /2026-0[678]/.test(d)));
});

test("Żory: lista ulic z numerami, zakresami i błędami składu PDF", () => {
  const e = parseStreetList("Brodecka 11, 11A, Wodzisławska 72, 72B, Kościuszki do nr 20, Warszawska od nr 22 do nr 32, Pukowca 5A-B, 106 A-C, Wysoka 30, 32 34, 3 Maja, Leśna 48A,50 Sosnowa 16A");
  const get = (s: string) => e.find(x => x.street === s)!;
  assert.deepEqual(get("Brodecka").numbers, [{ kind: "exact", value: "11" }, { kind: "exact", value: "11A" }]);
  assert.deepEqual(get("Kościuszki").numbers, [{ kind: "upTo", max: 20 }]);
  assert.deepEqual(get("Warszawska").numbers, [{ kind: "range", from: 22, to: 32, raw: "od nr 22 do nr 32" }]);
  assert.deepEqual(get("Pukowca").numbers!.map(n => (n as { value: string }).value), ["5A", "5B", "106A", "106B", "106C"]);
  assert.deepEqual(get("Wysoka").numbers!.map(n => (n as { value: string }).value), ["30", "32", "34"]);
  assert.equal(get("3 Maja").numbers, null);
  assert.deepEqual(get("Sosnowa").numbers, [{ kind: "exact", value: "16A" }]);
  assert.ok(get("Leśna").numbers!.some(n => n.kind === "exact" && n.value === "50"));
});

test("Żory: dopasowanie strefy – budynek ma pierwszeństwo przed ulicą", () => {
  const m = (s: string, n: string | null) => matchZoryZone(doc.zones, s, n);
  const a = m("Wodzisławska", "72");
  assert.ok(a.ok && a.zone.label === "Rejon 1 utrudniony" && a.matchedBy === "BUILDING");
  const b = m("Wodzisławska", "10");
  assert.ok(b.ok && b.zone.label === "Rejon 1" && b.matchedBy === "STREET");
  const c = m("Wodzisławska", "218");
  assert.ok(c.ok && c.zone.label === "Rejon 2");
  const d = m("Kościuszki", "15");
  assert.ok(d.ok && d.zone.label === "Rejon 2 utrudniony", "zakres „do nr 20”");
  const e = m("Kościuszki", "40");
  assert.ok(e.ok && e.zone.label === "Rejon 10");
});

test("Żory: brak numeru, gdy ulica ma wyjątki → prośba o numer, nie zgadywanie", () => {
  assert.deepEqual(matchZoryZone(doc.zones, "Wodzisławska", null), { ok: false, reason: "NEEDS_NUMBER" });
  assert.deepEqual(matchZoryZone(doc.zones, "Nieistniejąca", "1"), { ok: false, reason: "NO_STREET" });
});

test("Żory: nieczytelny blok blokuje potwierdzenie dla ulic z tego bloku", () => {
  const broken = zoryBbox().replace(/>Styczeń</, ">Styczen<");   // psujemy nagłówek pierwszej tabeli
  const d2 = parseZoryBbox(broken);
  assert.equal(d2.zones[0].valid, false);
  const r = matchZoryZone(d2.zones, "Beskidzka", "1");
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, "INVALID_ZONE");
});

test("Żory: podpowiedzi ulic bez duplikatów i bez śmieci", () => {
  const s = allStreets(doc);
  assert.ok(s.includes("Wodzisławska"));
  assert.ok(s.includes("Aleja Armii Krajowej") && !s.includes("Al. Armii Krajowej"));
  assert.ok(s.every(x => /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3}/.test(x)));
});

test("Żory: dokument w innym formacie jest odrzucany", () => {
  assert.throws(() => parseZoryBbox("<doc><page><word xMin=\"1\" yMin=\"1\" xMax=\"2\" yMax=\"2\">Coś</word></page></doc>"), /roku/);
});
