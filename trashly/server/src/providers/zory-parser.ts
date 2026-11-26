import { daysInMonth, isoDate } from "../lib/dates.ts";
import { decodeEntities, normNumber, sameStreet, splitNumber, streetKey } from "../lib/text.ts";
import { mapCategory } from "../domain/categories.ts";
import type { CollectionEvent } from "../domain/types.ts";

// Parser oficjalnego PDF „Harmonogram wywozu odpadów komunalnych w RRRR r.” (UM Żory),
// po konwersji `pdftotext -bbox` (współrzędne każdego słowa). Struktura bloku:
//   Rejon 3: Ulica A, Ulica B 5, 5A, ...           ← lista ulic (może zajmować kilka linii)
//   Rodzaj / Miesiąc  Styczeń Luty ... Grudzień     ← nagłówek kolumn
//   Zmieszane          5, 26   16   ...             ← wiersze frakcji
// Bloki „Rejon N utrudniony” powtarzają nazwy w różnych sekcjach z INNYMI terminami,
// więc identyfikatorem strefy jest kolejny numer bloku, nie sama nazwa.

export type NumberSpec =
  | { kind: "exact"; value: string }
  | { kind: "range"; from: number; to: number; raw: string }
  | { kind: "upTo"; max: number };

export interface StreetEntry { street: string; numbers: NumberSpec[] | null; }

export interface ZoryZone {
  id: string;            // „blok-07”
  label: string;         // „Rejon 3 utrudniony”
  raw: string;           // surowy tekst listy ulic (do kontroli bezpieczeństwa przy błędach)
  entries: StreetEntry[];
  events: CollectionEvent[];
  valid: boolean;
  errors: string[];
}

export interface ZoryDocument { year: number; zones: ZoryZone[]; warnings: string[]; }

const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const ROW_LABELS = ["Zmieszane", "Bioodpady kuchenne", "Odpady zielone", "Popiół", "Papier/Plastik/Szkło", "Elektronika", "Gabaryty", "Opony", "Akcja liście", "Akcja choinki", "Liście", "Choinki"];
const ROW_RE = new RegExp(`^(${ROW_LABELS.map(l => l.replace(/\//g, "\\/")).join("|")})(?= \\d| *$)`);
const BLOCK_RE = /^\s*(Rejon\s+\d+(?:\s+utrudniony)?)\s*:\s*(.*)$/;
const HEADER_RE = /^Rodzaj\b.*Styczeń/;
const MONTH_WORDS = /^(Maja|Listopada|Stycznia|Lutego|Marca|Kwietnia|Czerwca|Lipca|Sierpnia|Września|Października|Grudnia)\b/;

// ---------- lista ulic ----------

function expandNumberToken(tok: string): NumberSpec[] {
  const t = tok.trim().replace(/\.$/, "");
  let m = t.match(/^od\s+nr\.?\s*(\d+)\s+do\s+nr\.?\s*(\d+)$/i);
  if (m) return [{ kind: "range", from: Number(m[1]), to: Number(m[2]), raw: t }];
  m = t.match(/^do\s+nr\.?\s*(\d+)$/i);
  if (m) return [{ kind: "upTo", max: Number(m[1]) }];
  m = t.match(/^(\d+)([A-ZĄĆĘŁŃÓŚŹŻ])-([A-ZĄĆĘŁŃÓŚŹŻ])$/i);           // 5A-B, 39A-C
  if (m) {
    const out: NumberSpec[] = [];
    for (let c = m[2].toUpperCase().charCodeAt(0); c <= m[3].toUpperCase().charCodeAt(0); c++) out.push({ kind: "exact", value: m[1] + String.fromCharCode(c) });
    return out;
  }
  m = t.match(/^(\d+)-(\d+)$/);                                            // 102-104
  if (m) return [{ kind: "range", from: Number(m[1]), to: Number(m[2]), raw: t }];
  if (/^\d+[A-ZĄĆĘŁŃÓŚŹŻ]{0,3}$/i.test(t)) return [{ kind: "exact", value: normNumber(t) }];
  return [];
}

/** Rozbija „Wodzisławska 72B” na ulicę i numer; „3 Maja” zostaje ulicą. */
function splitStreetAndNumber(tok: string): { street: string; number: string | null } {
  const m = tok.match(/^(.*\D)\s+(\d+[A-ZĄĆĘŁŃÓŚŹŻ]{0,3}(?:-[A-Z0-9]+)?)$/i);
  if (m && !/^\d+$/.test(m[1].trim())) return { street: m[1].trim(), number: m[2] };
  return { street: tok.trim(), number: null };
}

export function parseStreetList(text: string): StreetEntry[] {
  const entries: StreetEntry[] = [];
  let cur: StreetEntry | null = null;
  const addNumbers = (specs: NumberSpec[]) => {
    if (!cur || specs.length === 0) return false;
    cur.numbers = [...(cur.numbers ?? []), ...specs];
    return true;
  };
  const startStreet = (tok: string) => {
    const { street, number } = splitStreetAndNumber(tok);
    cur = { street: street.replace(/\s+/g, " "), numbers: null };
    entries.push(cur);
    if (number) addNumbers(expandNumberToken(number));
  };
  const tokens = text.replace(/\s+/g, " ").replace(/\.\s*$/, "").split(/\s*,\s*/).map(t => t.trim()).filter(Boolean);
  const NUM = "\\d+[A-ZĄĆĘŁŃÓŚŹŻ]{0,3}(?:-[A-Z])?";
  for (let tok of tokens) {
    // „106 A-C” → „106A-C”; „32 34” / „1F 1G” (brak przecinka w PDF) → kilka numerów
    tok = tok.replace(/^(\d+)\s+([A-Z](?:-[A-Z])?)$/, "$1$2");
    if (new RegExp(`^${NUM}(\\s+${NUM})+$`, "i").test(tok)) {
      for (const n of tok.split(/\s+/)) addNumbers(expandNumberToken(n.replace(/^(\d+)([A-Z])-([A-Z])$/i, "$1$2-$3")));
      continue;
    }
    if (/^(od|do)\s+nr/i.test(tok)) { addNumbers(expandNumberToken(tok)); continue; }
    const rangeM = tok.match(/^(.*\D)\s+((?:od\s+nr\.?\s*\d+\s+)?do\s+nr\.?\s*\d+)$/i);   // „Warszawska od nr 22 do nr 32”
    if (rangeM) { startStreet(rangeM[1]); addNumbers(expandNumberToken(rangeM[2])); continue; }
    if (/^\d/.test(tok)) {
      const m = tok.match(/^(\d+[A-ZĄĆĘŁŃÓŚŹŻ]{0,3}(?:-[A-Z0-9]+)?)\s+(\D.*)$/i);
      if (m) {
        if (MONTH_WORDS.test(m[2])) { startStreet(tok); continue; }   // „3 Maja”, „11 Listopada”
        addNumbers(expandNumberToken(m[1]));                           // „50 Sosnowa 16A” (brak przecinka w PDF)
        startStreet(m[2]);
        continue;
      }
      if (!addNumbers(expandNumberToken(tok))) startStreet(tok);
      continue;
    }
    startStreet(tok);
  }
  return entries;
}

export function numberMatches(spec: NumberSpec, number: string): boolean {
  const n = normNumber(number);
  const sp = splitNumber(n);
  if (spec.kind === "exact") return spec.value === n;
  if (!sp) return false;
  if (spec.kind === "upTo") return sp.num <= spec.max;
  return n === spec.raw || (sp.num >= spec.from && sp.num <= spec.to);
}

// ---------- tabele (wejście: `pdftotext -bbox`, współrzędne słów w punktach PDF) ----------

interface Word { x0: number; x1: number; y: number; text: string; }
interface Line { page: number; words: Word[]; text: string; }

/** Zamienia wynik `pdftotext -bbox` na linie słów (grupowanie po współrzędnej Y na stronie). */
export function bboxToLines(html: string): Line[] {
  const lines: Line[] = [];
  const pages = html.split(/<page\b/).slice(1);
  pages.forEach((pg, pageIdx) => {
    const words: Word[] = [...pg.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="[\d.]+">([^<]*)<\/word>/g)]
      .map(m => ({ x0: Number(m[1]), y: Number(m[2]), x1: Number(m[3]), text: decodeEntities(m[4]) }));
    words.sort((a, b) => a.y - b.y || a.x0 - b.x0);
    let cur: Word[] = [];
    const flush = () => { if (cur.length) { cur.sort((a, b) => a.x0 - b.x0); lines.push({ page: pageIdx + 1, words: cur, text: cur.map(w => w.text).join(" ") }); } cur = []; };
    for (const w of words) {
      if (cur.length && Math.abs(w.y - cur[0].y) > 2.5) flush();
      cur.push(w);
    }
    flush();
  });
  return lines;
}

/** Granice kolumn miesięcy: środki między sąsiednimi nagłówkami. */
function monthColumns(line: Line): { center: number; lo: number; hi: number }[] {
  const centers: number[] = [];
  let from = 0;
  for (const name of MONTHS) {
    const idx = line.words.findIndex((w, i) => i >= from && w.text === name);
    if (idx < 0) throw new Error(`Brak kolumny „${name}” w nagłówku tabeli.`);
    centers.push((line.words[idx].x0 + line.words[idx].x1) / 2);
    from = idx + 1;
  }
  return centers.map((c, i) => {
    const prev = i > 0 ? centers[i - 1] : c - (centers[1] - centers[0]);
    const next = i < 11 ? centers[i + 1] : c + (centers[11] - centers[10]);
    return { center: c, lo: (prev + c) / 2, hi: (c + next) / 2 };
  });
}

function parseRow(line: Line, labelWords: number, cols: { lo: number; hi: number }[], year: number, rawName: string, errors: string[]): CollectionEvent[] {
  const cat = mapCategory(rawName);
  if (!cat) { errors.push(`Nieznana frakcja „${rawName}”.`); return []; }
  const perMonth: number[][] = Array.from({ length: 12 }, () => []);
  for (const w of line.words.slice(labelWords)) {
    const center = (w.x0 + w.x1) / 2;
    const col = cols.findIndex(c => center >= c.lo && center < c.hi);
    if (col < 0) { errors.push(`${rawName}: wartość „${w.text}” poza kolumnami miesięcy.`); continue; }
    for (const part of w.text.split(/[,;]/).map(s => s.trim()).filter(Boolean)) {
      if (!/^\d{1,2}$/.test(part)) { errors.push(`${rawName}: nieoczekiwana wartość „${w.text}”.`); continue; }
      perMonth[col].push(Number(part));
    }
  }
  const events: CollectionEvent[] = [];
  perMonth.forEach((days, idx) => {
    const month = idx + 1;
    let prev = 0;
    for (const d of days) {
      if (d < 1 || d > daysInMonth(year, month)) { errors.push(`${rawName}: nieistniejąca data ${d}.${month}.${year}.`); continue; }
      if (d <= prev) errors.push(`${rawName}: daty w miesiącu ${MONTHS[idx]} nie są rosnące.`);
      prev = d;
      events.push({ date: isoDate(year, month, d), category: cat, rawName });
    }
  });
  return events;
}

export function parseZoryBbox(html: string): ZoryDocument {
  const lines = bboxToLines(html);
  const all = lines.map(l => l.text).join("\n");
  const yearM = all.match(/Harmonogram wywozu odpadów komunalnych w (\d{4}) r/);
  if (!yearM) throw new Error("Nie rozpoznano roku harmonogramu – dokument ma inny format niż oczekiwany.");
  const year = Number(yearM[1]);
  const zones: ZoryZone[] = [];
  const warnings: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const bm = lines[i].text.match(BLOCK_RE);
    if (!bm) { i++; continue; }
    const label = bm[1].replace(/\s+/g, " ");
    let streets = bm[2].trim();
    i++;
    while (i < lines.length && !HEADER_RE.test(lines[i].text) && !BLOCK_RE.test(lines[i].text)) {
      const t = lines[i].text.trim();
      if (t) streets = streets.endsWith("-") ? streets + t : `${streets} ${t}`;
      i++;
    }
    const zone: ZoryZone = { id: `blok-${String(zones.length + 1).padStart(2, "0")}`, label, raw: streets, entries: parseStreetList(streets), events: [], valid: false, errors: [] };
    zones.push(zone);
    if (i >= lines.length || !HEADER_RE.test(lines[i].text)) { zone.errors.push("Brak tabeli terminów pod listą ulic."); }
    else {
      let cols: { center: number; lo: number; hi: number }[] | null = null;
      try { cols = monthColumns(lines[i]); } catch (e) { zone.errors.push((e as Error).message); }
      i++;
      const seenRows = new Set<string>();
      for (; cols && i < lines.length; i++) {
        const line = lines[i];
        if (BLOCK_RE.test(line.text) || /Harmonogram wywozu odpadów/.test(line.text) || HEADER_RE.test(line.text)) break;
        const rm = line.text.match(ROW_RE);
        if (!rm) {
          if (/^[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][^\d]{3,}\s\d/.test(line.text)) zone.errors.push(`Nierozpoznany wiersz: „${line.text.slice(0, 40)}”.`);
          continue;
        }
        const rawName = rm[1];
        if (seenRows.has(rawName)) { zone.errors.push(`Powtórzony wiersz „${rawName}”.`); continue; }
        seenRows.add(rawName);
        zone.events.push(...parseRow(line, rawName.split(" ").length, cols, year, rawName, zone.errors));
      }
    }
    const mixed = zone.events.filter(e => e.category === "zmieszane").length;
    if (mixed < 6) zone.errors.push(`Za mało terminów odpadów zmieszanych (${mixed}) – tabela prawdopodobnie odczytana niepoprawnie.`);
    if (zone.entries.length === 0) zone.errors.push("Pusta lista ulic.");
    for (const e of zone.entries) {
      if (!/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3}/.test(e.street) || (/^\d/.test(e.street) && !MONTH_WORDS.test(e.street.replace(/^\d+\s+/, "")))) {
        zone.errors.push(`Nierozpoznany fragment listy ulic: „${e.street}”.`);
      }
    }
    zone.valid = zone.errors.length === 0;
    if (!zone.valid) warnings.push(`${zone.id} (${zone.label}): ${zone.errors.join(" ")}`);
  }
  if (zones.length === 0) throw new Error("Nie znaleziono żadnego rejonu w dokumencie.");
  return { year, zones, warnings };
}

// ---------- dopasowanie adresu do strefy ----------

export type ZoneMatch =
  | { ok: true; zone: ZoryZone; matchedBy: "BUILDING" | "STREET" }
  | { ok: false; reason: "NO_STREET" | "NEEDS_NUMBER" | "NO_ZONE_FOR_NUMBER" | "AMBIGUOUS" | "INVALID_ZONE"; candidates?: string[] };

export function matchZoryZone(zones: ZoryZone[], street: string, number: string | null): ZoneMatch {
  const cands: { zone: ZoryZone; spec: number }[] = [];
  let streetSeen = false, hasNumberSpecific = false;
  for (const zone of zones) {
    for (const e of zone.entries) {
      if (!sameStreet(e.street, street)) continue;
      streetSeen = true;
      if (e.numbers === null) cands.push({ zone, spec: 1 });
      else {
        hasNumberSpecific = true;
        if (number && e.numbers.some(s => numberMatches(s, number))) cands.push({ zone, spec: 2 });
      }
    }
  }
  // Bezpieczeństwo: jeśli ulica występuje w bloku, którego nie udało się poprawnie odczytać,
  // nie wiemy, czy nie ma tam wyjątku dla tego budynku → nie potwierdzamy harmonogramu.
  const key = streetKey(street);
  const broken = zones.filter(z => !z.valid && streetKey(z.raw).includes(key));
  if (broken.length) return { ok: false, reason: "INVALID_ZONE", candidates: broken.map(z => z.label) };
  if (!streetSeen) return { ok: false, reason: "NO_STREET" };
  if (!number && hasNumberSpecific) return { ok: false, reason: "NEEDS_NUMBER" };
  if (cands.length === 0) return { ok: false, reason: "NO_ZONE_FOR_NUMBER" };
  const best = Math.max(...cands.map(c => c.spec));
  const top = [...new Map(cands.filter(c => c.spec === best).map(c => [c.zone.id, c.zone])).values()];
  const sig = (z: ZoryZone) => z.events.map(e => e.date + e.category).sort().join("|");
  if (new Set(top.map(sig)).size > 1) return { ok: false, reason: "AMBIGUOUS", candidates: top.map(z => z.label) };
  const zone = top[0];
  if (!zone.valid) return { ok: false, reason: "INVALID_ZONE", candidates: [zone.label] };
  return { ok: true, zone, matchedBy: best === 2 ? "BUILDING" : "STREET" };
}

/** Wszystkie nazwy ulic z dokumentu (do podpowiedzi). */
export function allStreets(doc: ZoryDocument): string[] {
  const m = new Map<string, string>();
  for (const z of doc.zones) for (const e of z.entries) {
    const k = streetKey(e.street), prev = m.get(k);
    if (!prev || e.street.length > prev.length) m.set(k, e.street);   // „Aleja Armii Krajowej” zamiast „Al. Armii Krajowej”
  }
  return [...m.values()].sort((a, b) => a.localeCompare(b, "pl"));
}
