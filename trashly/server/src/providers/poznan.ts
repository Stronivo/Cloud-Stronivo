import { HttpClient } from "../lib/http.ts";
import { decodeEntities, fold, normNumber, sameStreet, titleCase } from "../lib/text.ts";
import { daysInMonth, isoDate, parseDayList } from "../lib/dates.ts";
import { mapCategory } from "../domain/categories.ts";
import { CITIES } from "./cities.ts";
import { intervalFromEnv, type ScheduleProvider, type StreetSuggestion, type ZoneLocation } from "./provider.ts";
import { ProviderError, type AddressInput, type CategoryKey, type CollectionEvent, type ProviderSchedule, type ResolvedAddress, type ScheduleSource } from "../domain/types.ts";
import type { AddressRegistry } from "../address/prg.ts";

// Poznań – oficjalna wyszukiwarka harmonogramów na poznan.pl (te same zapytania wykonuje formularz na stronie).

const PAGE = "https://www.poznan.pl/mim/odpady/harmonogramy.html";
const STREET_LOOKUP = "https://www.poznan.pl/mim/public/odpady/waste_street_lookup.html";
const NUMBER_LOOKUP = "https://www.poznan.pl/mim/public/odpady/waste_number_lookup.html";

function parseLis(html: string): string[] {
  return [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(m => decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim()).filter(Boolean);
}

/** Parsuje tabele harmonogramu z poznan.pl. Eksport do testów. */
export function parsePoznanSchedule(html: string, zoneKey: string, zoneLabel: string): ProviderSchedule {
  const tables = [...html.matchAll(/<table id="schedule_\d+">([\s\S]*?)<\/table>/g)].map(m => m[1]);
  if (tables.length === 0) throw new ProviderError("NOT_FOUND", "Źródło nie zwróciło harmonogramu dla tego adresu.");
  const parsed = tables.map(parseTable);
  // Kilka różnych harmonogramów pod jednym adresem = nie zgadujemy, który jest właściwy.
  const sig = (evs: CollectionEvent[]) => evs.map(e => e.date + e.category).join("|");
  if (new Set(parsed.map(p => sig(p.events))).size > 1) {
    throw new ProviderError("VALIDATION_FAILED", "Pod tym adresem źródło podaje kilka różnych harmonogramów (np. dla różnych obiektów). Nie możemy jednoznacznie wybrać właściwego.");
  }
  const { events, lastMonth } = parsed[0];
  if (!events.some(e => e.category === "zmieszane")) throw new ProviderError("VALIDATION_FAILED", "Harmonogram nie zawiera terminów odpadów zmieszanych – odrzucamy go jako niekompletny.");
  return {
    zoneKey, zoneLabel, events, onDemand: [],
    source: { url: PAGE, type: "HTML", title: "Poznań – harmonogram odbioru odpadów (poznan.pl)" },
    coverage: "FULL_PERIOD",
    periodEnd: lastMonth ? isoDate(lastMonth.y, lastMonth.m, daysInMonth(lastMonth.y, lastMonth.m)) : null,
    notes: []
  };
}

function parseTable(t: string): { events: CollectionEvent[]; lastMonth: { y: number; m: number } | null } {
  const events: CollectionEvent[] = [];
  let lastMonth: { y: number; m: number } | null = null;
  for (const row of t.split(/<tr[^>]*>/).slice(1)) {
    const nameM = row.match(/<td class="[^"]*waste-type[^"]*">([\s\S]*?)<\/td>/);
    if (!nameM) continue;
    const rawName = decodeEntities(nameM[1].replace(/<[^>]+>/g, "")).trim();
    const cells = [...row.matchAll(/<td class="waste-date[^"]*" data-value="(\d{1,2})\.(\d{4})">([\s\S]*?)<\/td>/g)];
    const days = cells.flatMap(c => {
      const m = Number(c[1]), y = Number(c[2]);
      if (!lastMonth || y * 12 + m > lastMonth.y * 12 + lastMonth.m) lastMonth = { y, m };
      const txt = decodeEntities(c[3].replace(/<[^>]+>/g, "")).trim();
      let list: number[];
      try { list = parseDayList(txt); } catch (e) { throw new ProviderError("PARSE_ERROR", `Poznań: ${(e as Error).message}`); }
      return list.map(d => {
        if (d < 1 || d > daysInMonth(y, m)) throw new ProviderError("VALIDATION_FAILED", `Poznań: nieistniejący dzień ${d}.${m}.${y}.`);
        return isoDate(y, m, d);
      });
    });
    if (days.length === 0) continue; // np. „Odpady wystawkowe” bez terminów w tabeli
    const cat: CategoryKey | null = mapCategory(rawName);
    if (!cat) throw new ProviderError("VALIDATION_FAILED", `Poznań: nieznana frakcja „${rawName}”.`);
    for (const d of days) events.push({ date: d, category: cat, rawName });
  }
  return { events, lastMonth };
}

export class PoznanProvider implements ScheduleProvider {
  readonly city = CITIES.poznan;
  readonly updateIntervalHours = intervalFromEnv("poznan", 24);
  readonly staleAfterHours = 72;
  private http: HttpClient;
  private registry: AddressRegistry | null;
  constructor(http: HttpClient, registry: AddressRegistry | null) { this.http = http; this.registry = registry; }

  private async streets(q: string): Promise<string[]> {
    const res = await this.http.request({ url: STREET_LOOKUP, form: { ws_street: q }, cacheTtlMs: 24 * 3600_000 });
    return parseLis(res.text).filter(s => !/^brak wyników/i.test(s));
  }
  private async numbers(street: string, q: string): Promise<string[]> {
    const res = await this.http.request({ url: NUMBER_LOOKUP, form: { ws_number: q, ws_street: street }, cacheTtlMs: 24 * 3600_000 });
    return parseLis(res.text).filter(s => !/^brak wyników/i.test(s));
  }

  async suggestStreets(q: string): Promise<StreetSuggestion[]> {
    if (fold(q).length < 3) return [];
    return (await this.streets(q)).map(s => ({ name: titleCase(s) }));
  }
  async suggestNumbers(street: string, q: string): Promise<string[]> {
    if (!q) return [];
    const official = (await this.streets(street)).find(s => sameStreet(s, street));
    return official ? this.numbers(official, q) : [];
  }

  async resolve(input: AddressInput): Promise<ResolvedAddress> {
    const official = (await this.streets(input.street)).find(s => sameStreet(s, input.street));
    if (!official) throw new ProviderError("NOT_FOUND", `Nie znaleźliśmy ulicy „${input.street}” w wyszukiwarce harmonogramów Poznania.`);
    const number = normNumber(input.number || "");
    if (!number) throw new ProviderError("NOT_FOUND", "W Poznaniu harmonogram zależy od budynku – podaj numer.");
    const nums = await this.numbers(official, number);
    const hit = nums.find(n => normNumber(n) === number);
    if (!hit) throw new ProviderError("NOT_FOUND", `Nie znaleźliśmy budynku ${number} przy ulicy ${titleCase(official)} w systemie harmonogramów Poznania.`);
    const verifiedBy = ["Wyszukiwarka harmonogramów Miasta Poznania"];
    const addr: ResolvedAddress = {
      cityId: "poznan", street: titleCase(official), number: hit, apartment: input.apartment?.trim() || null,
      level: "BUILDING_VERIFIED", ids: { providerId: `${official}|${hit}` }, postalCode: null, location: null, verifiedBy
    };
    // Dodatkowo próbujemy pobrać identyfikatory TERYT z PRG (nie blokuje wyniku, jeśli PRG nie odpowiada).
    try {
      const prg = await this.registry?.findAddress(this.city, titleCase(official), hit);
      if (prg) {
        addr.ids = { ...addr.ids, teryt: prg.teryt, simc: prg.simc, ulic: prg.ulic };
        addr.postalCode = prg.postalCode;
        addr.location = { x: prg.x, y: prg.y, crs: "EPSG:2180" };
        verifiedBy.push("PRG (GUGiK)");
      }
    } catch { /* PRG niedostępny – adres i tak potwierdzony przez system miasta */ }
    return addr;
  }

  async locate(address: ResolvedAddress): Promise<ZoneLocation> {
    const [street, number] = (address.ids.providerId ?? "").split("|");
    if (!street || !number) throw new ProviderError("NOT_FOUND", "Brak danych adresu w systemie Poznania.");
    return { zoneKey: `${fold(street)}|${normNumber(number)}`, zoneLabel: `${address.street} ${address.number}`, refreshContext: { street, number } };
  }

  async fetchSchedule(ctx: Record<string, string>): Promise<ProviderSchedule> {
    const res = await this.http.request({
      url: PAGE,
      form: { action: "search", co: "waste_schedule", ws_street: ctx.street, ws_number: ctx.number, ws_object: "" }
    });
    return parsePoznanSchedule(res.text, `${fold(ctx.street)}|${normNumber(ctx.number)}`, `${titleCase(ctx.street)} ${ctx.number}`);
  }

  async listSources(): Promise<ScheduleSource[]> {
    return [{ url: PAGE, type: "HTML", title: "Poznań – harmonogram odbioru odpadów (poznan.pl)" }];
  }
}
