import { test } from "node:test";
import assert from "node:assert/strict";
import { fold, streetKey, sameStreet, normNumber, isValidBuildingNumber } from "../src/lib/text.ts";
import { parseDayList, isValidIsoDate, todayWarsaw, diffDaysIso } from "../src/lib/dates.ts";
import { mapCategory } from "../src/domain/categories.ts";

test("normalizacja polskich znaków i prefiksów ulic", () => {
  assert.equal(fold("Żółć Łąkowa"), "zolc lakowa");
  assert.equal(streetKey("ul. Marszałkowska"), "marszalkowska");
  assert.equal(streetKey("ulica Marszałkowska"), "marszalkowska");
  assert.equal(streetKey("Al. Armii Krajowej"), streetKey("Aleja Armii Krajowej"));
  assert.equal(streetKey("os. Piastowskie"), "piastowskie");
  assert.equal(streetKey("gen. Józefa Hallera"), "generala jozefa hallera");
});

test("dopasowanie ulic: alternatywna pisownia tak, podobne nazwy nie", () => {
  assert.ok(sameStreet("Głogowska", "GLOGOWSKA"));
  assert.ok(sameStreet("ulica Krupnicza", "Krupnicza"));
  assert.ok(sameStreet("Marii Skłodowskiej-Curie", "Skłodowskiej-Curie"));
  assert.ok(!sameStreet("Krucza", "Krupnicza"), "rozmyte dopasowanie musi być odrzucone");
  assert.ok(!sameStreet("Nowa", "Stara Nowa"), "zbyt krótki człon nie może pasować");
  assert.ok(!sameStreet("Wodzisławska", "Wodzisławska Boczna"));
});

test("numery budynków", () => {
  assert.equal(normNumber(" 12 a "), "12A");
  assert.ok(isValidBuildingNumber("12"));
  assert.ok(isValidBuildingNumber("84/92"));
  assert.ok(isValidBuildingNumber("102-104"));
  assert.ok(!isValidBuildingNumber("abc"));
  assert.ok(!isValidBuildingNumber("12; DROP TABLE"));
});

test("parsowanie list dni i dat", () => {
  assert.deepEqual(parseDayList("02, 09, 15"), [2, 9, 15]);
  assert.deepEqual(parseDayList("3;17"), [3, 17]);
  assert.deepEqual(parseDayList(""), []);
  assert.throws(() => parseDayList("5 i 7"));
  assert.ok(isValidIsoDate("2026-02-28"));
  assert.ok(!isValidIsoDate("2026-02-29"));
  assert.ok(isValidIsoDate("2028-02-29"));
  assert.equal(todayWarsaw(new Date("2026-11-26T23:30:00Z")), "2026-11-27", "po północy w Polsce to już następny dzień");
  assert.equal(diffDaysIso("2026-11-26", "2026-12-01"), 5);
});

test("mapowanie kategorii odpadów ze źródeł", () => {
  assert.equal(mapCategory("niesegregowane (zmieszane) odpady komunalne"), "zmieszane");
  assert.equal(mapCategory("Odpady zmieszane"), "zmieszane");
  assert.equal(mapCategory("Metale i tworzywa sztuczne"), "plastik");
  assert.equal(mapCategory("zmieszane odpady opakowaniowe"), "plastik");
  assert.equal(mapCategory("opakowania z papieru i tektury"), "papier");
  assert.equal(mapCategory("Szkło"), "szklo");
  assert.equal(mapCategory("Bioodpady kuchenne"), "bio");
  assert.equal(mapCategory("Odpady zielone"), "zielone");
  assert.equal(mapCategory("Papier/Plastik/Szkło"), "segregowane");
  assert.equal(mapCategory("Popiół"), "popiol");
  assert.equal(mapCategory("Odpady wystawkowe"), "gabaryty");
  assert.equal(mapCategory("Akcja choinki"), "choinki");
  assert.equal(mapCategory("Coś zupełnie nowego"), null, "nieznana frakcja nie może być zgadywana");
});
