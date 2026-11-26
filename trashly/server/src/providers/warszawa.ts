import { HttpClient } from "../lib/http.ts";
import { fold, normNumber, sameStreet, titleCase } from "../lib/text.ts";
import { isValidIsoDate } from "../lib/dates.ts";
import { mapCategory } from "../domain/categories.ts";
import { CITIES } from "./cities.ts";
import { intervalFromEnv, type ScheduleProvider, type StreetSuggestion, type ZoneLocation } from "./provider.ts";
import { ProviderError, type AddressInput, type CategoryKey, type CollectionEvent, type ProviderSchedule, type ResolvedAddress, type ScheduleSource } from "../domain/types.ts";

// Warszawa – oficjalna wyszukiwarka harmonogramów „Warszawa 19115”.
// Te same zapytania wykonuje strona warszawa19115.pl/harmonogramy-wywozu-odpadow.
// Rejestr punktów adresowych miasta daje walidację na poziomie budynku (addressPointId).

const PAGE = "https://warszawa19115.pl/harmonogramy-wywozu-odpadow";
const PORTLET = "portalCKMjunkschedules_WAR_portalCKMjunkschedulesportlet_INSTANCE_o5AIb2mimbRJ";
const NS = `_${PORTLET}_`;
const resUrl = (id: string) =>
  `${PAGE}?p_p_id=${PORTLET}&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage&p_p_resource_id=${id}`;

/** Kody frakcji systemu warszawskiego → kategorie kanoniczne. */
const FRACTIONS: Record<string, CategoryKey> = {
  ZM: "zmieszane", OP: "papier", MT: "plastik", OS: "szklo", BK: "bio", OZ: "zielone", WG: "gabaryty"
};

export interface WawPoint { street: string; number: string; postalCode: string; district: string; id: string; full: string; }

/** „MARSZAŁKOWSKA 84/92 00-514 Śródmieście” → części. Eksport do testów. */
export function parseWawFullName(full: string, id: string): WawPoint | null {
  const m = full.trim().match(/^(.+?)\s+(\d[\w/.-]*)\s+(\d{2}-\d{3})\s+(.+)$/u);
  if (!m) return null;
  return { street: titleCase(m[1]), number: m[2].toUpperCase(), postalCode: m[3], district: m[4], id, full };
}

/** Parsuje odpowiedź ajaxResource. Eksport do testów. */
export function parseWawSchedule(json: unknown, pointId: string): ProviderSchedule {
  if (!Array.isArray(json) || json.length === 0) throw new ProviderError("NOT_FOUND", "Źródło nie zwróciło harmonogramu dla tego punktu adresowego.");
  const entry = json[0] as { adres?: string; dzielnicy?: string; harmonogramyZ?: unknown[]; harmonogramyN?: unknown[] };
  const residential = Array.isArray(entry.harmonogramyZ) && entry.harmonogramyZ.length > 0;
  const list = (residential ? entry.harmonogramyZ : entry.harmonogramyN) as { data?: string; frakcja?: { id_frakcja?: string; nazwa?: string } }[] | undefined;
  if (!list || list.length === 0) throw new ProviderError("NOT_FOUND", "Dla tego adresu źródło nie publikuje harmonogramu.");
  const events: CollectionEvent[] = [];
  const onDemand = new Set<CategoryKey>();
  for (const it of list) {
    const code = it.frakcja?.id_frakcja ?? "";
    const name = it.frakcja?.nazwa ?? code;
    const cat = FRACTIONS[code] ?? mapCategory(name);
    if (!cat) throw new ProviderError("VALIDATION_FAILED", `Nieznana frakcja w źródle: „${name}” (${code}).`);
    if (it.data === "1900-01-01") { onDemand.add(cat); continue; } // tak źródło oznacza „na zgłoszenie”
    if (!it.data || !isValidIsoDate(it.data)) throw new ProviderError("VALIDATION_FAILED", `Nieprawidłowa data w źródle: „${it.data}”.`);
    events.push({ date: it.data, category: cat, rawName: name });
  }
  return {
    zoneKey: `punkt-${pointId}`,
    zoneLabel: `${entry.adres ?? "Punkt adresowy"}${entry.dzielnicy ? ", " + entry.dzielnicy : ""}`,
    events, onDemand: [...onDemand],
    source: { url: PAGE, type: "API", title: "Warszawa 19115 – harmonogramy odbioru odpadów" },
    coverage: "NEXT_ONLY", periodEnd: null,
    notes: [residential ? "Harmonogram dla nieruchomości zamieszkałych." : "Harmonogram dla nieruchomości niezamieszkałych."]
  };
}

export class WarszawaProvider implements ScheduleProvider {
  readonly city = CITIES.warszawa;
  readonly updateIntervalHours = intervalFromEnv("warszawa", 12);
  readonly staleAfterHours = 48;
  private http: HttpClient;
  constructor(http: HttpClient) { this.http = http; }

  private async search(text: string): Promise<WawPoint[]> {
    const res = await this.http.request({ url: resUrl("autocompleteResource"), form: { [`${NS}name`]: text }, cacheTtlMs: 6 * 3600_000 });
    let arr: { fullName?: string; addressPointId?: string }[];
    try { arr = JSON.parse(res.text); } catch { throw new ProviderError("PARSE_ERROR", "Wyszukiwarka adresów Warszawy zwróciła nieoczekiwaną odpowiedź.", true); }
    if (!Array.isArray(arr)) return [];
    return arr.map(a => parseWawFullName(String(a.fullName ?? ""), String(a.addressPointId ?? ""))).filter((p): p is WawPoint => !!p && !!p.id);
  }

  async suggestStreets(q: string): Promise<StreetSuggestion[]> {
    if (fold(q).length < 3) return [];
    const pts = await this.search(q);
    const seen = new Map<string, StreetSuggestion>();
    for (const p of pts) if (!seen.has(fold(p.street))) seen.set(fold(p.street), { name: p.street, hint: p.district });
    return [...seen.values()];
  }

  async suggestNumbers(street: string, q: string): Promise<string[]> {
    const pts = await this.search(`${street} ${q}`.trim());
    return [...new Set(pts.filter(p => sameStreet(p.street, street) && normNumber(p.number).startsWith(normNumber(q))).map(p => p.number))];
  }

  async resolve(input: AddressInput): Promise<ResolvedAddress> {
    const number = normNumber(input.number || "");
    if (!number) throw new ProviderError("NOT_FOUND", "W Warszawie harmonogram zależy od budynku – podaj numer.");
    const pts = await this.search(`${input.street} ${number}`);
    const exact = pts.filter(p => sameStreet(p.street, input.street) && normNumber(p.number) === number);
    if (exact.length === 0) {
      const streetOnly = (await this.search(input.street)).some(p => sameStreet(p.street, input.street));
      throw new ProviderError("NOT_FOUND", streetOnly
        ? `Nie znaleźliśmy budynku ${number} przy ulicy ${input.street} w rejestrze punktów adresowych Warszawy.`
        : `Nie znaleźliśmy ulicy „${input.street}” w Warszawie.`);
    }
    if (new Set(exact.map(p => p.id)).size > 1) {
      throw new ProviderError("NOT_FOUND", `Pod adresem ${input.street} ${number} jest kilka punktów odbioru. Wybierz adres z listy podpowiedzi.`);
    }
    const p = exact[0];
    return {
      cityId: "warszawa", street: p.street, number: p.number, apartment: input.apartment?.trim() || null,
      level: "BUILDING_VERIFIED", ids: { providerId: p.id }, postalCode: p.postalCode, location: null,
      verifiedBy: ["Rejestr punktów adresowych systemu odpadowego m.st. Warszawy"]
    };
  }

  async locate(address: ResolvedAddress): Promise<ZoneLocation> {
    const id = address.ids.providerId;
    if (!id) throw new ProviderError("NOT_FOUND", "Brak identyfikatora punktu adresowego.");
    return { zoneKey: `punkt-${id}`, zoneLabel: `${address.street} ${address.number}`, refreshContext: { addressPointId: id } };
  }

  async fetchSchedule(ctx: Record<string, string>): Promise<ProviderSchedule> {
    if (!/^\d+$/.test(ctx.addressPointId ?? "")) throw new ProviderError("VALIDATION_FAILED", "Nieprawidłowy identyfikator punktu adresowego.");
    const res = await this.http.request({ url: resUrl("ajaxResource"), form: { [`${NS}addressPointId`]: ctx.addressPointId } });
    let json: unknown;
    try { json = JSON.parse(res.text); } catch { throw new ProviderError("PARSE_ERROR", "Źródło Warszawy zwróciło nieoczekiwaną odpowiedź.", true); }
    return parseWawSchedule(json, ctx.addressPointId);
  }

  async listSources(): Promise<ScheduleSource[]> {
    return [{ url: PAGE, type: "API", title: "Warszawa 19115 – harmonogramy odbioru odpadów" }];
  }
}
