import { HttpClient } from "../lib/http.ts";
import { extractPdfLinks, pdfToBbox, sha256 } from "../lib/pdf.ts";
import { fold, normNumber, sameStreet, streetKey } from "../lib/text.ts";
import { todayWarsaw } from "../lib/dates.ts";
import { CITIES } from "./cities.ts";
import { intervalFromEnv, type ScheduleProvider, type StreetSuggestion, type ZoneLocation } from "./provider.ts";
import { allStreets, matchZoryZone, parseZoryBbox, type ZoryDocument } from "./zory-parser.ts";
import { ProviderError, type AddressInput, type ProviderSchedule, type ResolvedAddress, type ScheduleSource } from "../domain/types.ts";
import type { AddressRegistry } from "../address/prg.ts";
import type { Store } from "../store/store.ts";

// Żory – oficjalny PDF „Harmonogram wywozu odpadów komunalnych w RRRR r.” ze strony UM Żory.
// Potok: lista PDF na stronie → pobranie → SHA-256 → (jeśli nowa wersja) pdftotext -bbox → parser
// → walidacja → zapis dokumentu. Harmonogramy stref są publikowane tylko z poprawnie zwalidowanych bloków.

const LISTING = CITIES.zory.officialInfoUrl;

export type PdfToText = (pdf: Uint8Array) => Promise<string>;

export class ZoryProvider implements ScheduleProvider {
  readonly city = CITIES.zory;
  readonly updateIntervalHours = intervalFromEnv("zory", 24);
  readonly staleAfterHours = 24 * 7;
  private http: HttpClient;
  private registry: AddressRegistry;
  private store: Store;
  private pdfToText: PdfToText;
  private memo: { at: number; doc: ZoryDocument; source: ScheduleSource } | null = null;
  private now: () => Date;

  constructor(http: HttpClient, registry: AddressRegistry, store: Store, pdfToText: PdfToText = pdfToBbox, now: () => Date = () => new Date()) {
    this.http = http; this.registry = registry; this.store = store; this.pdfToText = pdfToText; this.now = now;
  }

  async listSources(): Promise<ScheduleSource[]> {
    const page = await this.http.request({ url: LISTING, cacheTtlMs: 3600_000 });
    const year = todayWarsaw(this.now()).slice(0, 4);
    return extractPdfLinks(page.text, LISTING)
      .filter(l => /harmonogram/i.test(l.url) && l.url.includes(year))
      .map(l => ({ url: l.url, type: "PDF" as const, title: `UM Żory – ${l.title}` }));
  }

  /** Ładuje (i w razie zmiany pliku – ponownie parsuje) aktualny dokument. */
  async loadDocument(force = false): Promise<{ doc: ZoryDocument; source: ScheduleSource }> {
    if (!force && this.memo && Date.now() - this.memo.at < 3600_000) return this.memo;
    // Plik dla zabudowy jednorodzinnej (strona ma osobne harmonogramy dla wielorodzinnej).
    const sources = (await this.listSources()).filter(s => /wszystkie|rejon|jednorodzin/i.test(s.url + " " + s.title) && !/wielorodzin/i.test(s.url + " " + s.title));
    if (sources.length === 0) throw new ProviderError("NOT_FOUND", "Na stronie UM Żory nie znaleziono harmonogramu PDF na bieżący rok.");
    if (sources.length > 1) {
      throw new ProviderError("VALIDATION_FAILED", `Na stronie UM Żory jest kilka harmonogramów ogólnomiejskich (${sources.length}). Wymagana ręczna weryfikacja, który obowiązuje.`);
    }
    const source = sources[0];
    const res = await this.http.request({ url: source.url });
    const hash = sha256(res.bytes);
    const prev = await this.store.getDocument(source.url);
    let doc: ZoryDocument;
    if (prev && prev.sha256 === hash && prev.parsed && prev.parseErrors.length === 0) {
      doc = prev.parsed as ZoryDocument;
      await this.store.putDocument({ ...prev, fetchedAt: new Date().toISOString() });
    } else {
      const bbox = await this.pdfToText(res.bytes);
      try { doc = parseZoryBbox(bbox); }
      catch (e) {
        await this.store.putDocument({ url: source.url, cityId: "zory", sha256: hash, fetchedAt: new Date().toISOString(), firstSeenAt: new Date().toISOString(), parsed: null, parseErrors: [(e as Error).message] });
        throw new ProviderError("PARSE_ERROR", `Nie udało się przetworzyć PDF z harmonogramem Żor: ${(e as Error).message}`);
      }
      if (String(doc.year) !== todayWarsaw(this.now()).slice(0, 4)) throw new ProviderError("VALIDATION_FAILED", `Dokument dotyczy roku ${doc.year}, a nie bieżącego.`);
      await this.store.putDocument({
        url: source.url, cityId: "zory", sha256: hash, fetchedAt: new Date().toISOString(),
        firstSeenAt: prev?.sha256 === hash ? prev.firstSeenAt : new Date().toISOString(),
        parsed: doc, parseErrors: doc.warnings
      });
    }
    this.memo = { at: Date.now(), doc, source: { ...source, title: `${source.title} (SHA-256: ${hash.slice(0, 12)}…)` } };
    return this.memo;
  }

  async suggestStreets(q: string): Promise<StreetSuggestion[]> {
    const k = fold(q);
    if (k.length < 2) return [];
    const { doc } = await this.loadDocument();
    const key = streetKey(q);
    return allStreets(doc)
      .filter(s => streetKey(s).startsWith(key) || streetKey(s).includes(" " + key) || fold(s).includes(k))
      .slice(0, 12).map(name => ({ name }));
  }

  async suggestNumbers(): Promise<null> { return null; }   // PDF nie zawiera pełnej listy numerów

  async resolve(input: AddressInput): Promise<ResolvedAddress> {
    const { doc } = await this.loadDocument();
    const official = allStreets(doc).find(s => sameStreet(s, input.street));
    if (!official) throw new ProviderError("NOT_FOUND", `Ulicy „${input.street}” nie ma w oficjalnym harmonogramie Żor.`);
    const number = normNumber(input.number || "");
    const addr: ResolvedAddress = {
      cityId: "zory", street: official, number, apartment: input.apartment?.trim() || null,
      buildingType: input.buildingType ?? null,
      level: "STREET_VERIFIED", ids: {}, postalCode: null, location: null,
      verifiedBy: ["Harmonogram UM Żory (lista ulic)"]
    };
    if (!number) return addr;
    // Numer budynku weryfikujemy w PRG. Gdy PRG zna ulicę, a nie zna budynku – odrzucamy.
    try {
      const a = await this.registry.findAddress(this.city, official, number);
      if (a) {
        addr.level = "BUILDING_VERIFIED";
        addr.ids = { teryt: a.teryt, simc: a.simc, ulic: a.ulic };
        addr.postalCode = a.postalCode;
        addr.location = { x: a.x, y: a.y, crs: "EPSG:2180" };
        addr.verifiedBy.push("PRG (GUGiK)");
      } else if (await this.registry.findStreet(this.city, official)) {
        throw new ProviderError("NOT_FOUND", `Nie znaleźliśmy budynku ${number} przy ulicy ${official} w Państwowym Rejestrze Granic (PRG).`);
      }
    } catch (e) {
      if (e instanceof ProviderError && e.code === "NOT_FOUND") throw e;
      // PRG niedostępny – zostajemy przy weryfikacji ulicy, nie udajemy weryfikacji budynku.
    }
    return addr;
  }

  async locate(address: ResolvedAddress): Promise<ZoneLocation> {
    if (address.buildingType !== "SINGLE") {
      throw new ProviderError("NOT_INTEGRATED", address.buildingType === "MULTI"
        ? "Dla zabudowy wielorodzinnej Urząd Miasta Żory publikuje osobne harmonogramy (pliki DOCX dla każdej frakcji). Tej integracji jeszcze nie ukończyliśmy, dlatego nie pokazujemy terminów – skorzystaj z oficjalnych plików."
        : "Wskaż typ zabudowy – w Żorach domy jednorodzinne i budynki wielorodzinne mają różne harmonogramy.");
    }
    const { doc } = await this.loadDocument();
    const m = matchZoryZone(doc.zones, address.street, address.number || null);
    if (!m.ok) {
      const msg: Record<typeof m.reason, string> = {
        NO_STREET: "Tej ulicy nie ma w harmonogramie.",
        NEEDS_NUMBER: "Dla tej ulicy harmonogram zależy od numeru budynku – podaj numer.",
        NO_ZONE_FOR_NUMBER: "Ten numer budynku nie jest przypisany do żadnego rejonu w harmonogramie.",
        AMBIGUOUS: `Adres pasuje do kilku rejonów z różnymi terminami (${(m.candidates ?? []).join(", ")}).`,
        INVALID_ZONE: `Fragment harmonogramu dla tego adresu (${(m.candidates ?? []).join(", ")}) nie przeszedł walidacji.`
      };
      throw new ProviderError(m.reason === "NEEDS_NUMBER" ? "NOT_FOUND" : "VALIDATION_FAILED", msg[m.reason]);
    }
    return {
      zoneKey: m.zone.id + ":" + fold(m.zone.label).replace(/\s+/g, "-"),
      zoneLabel: m.zone.label + (m.matchedBy === "BUILDING" ? " (przypisanie po numerze budynku)" : ""),
      refreshContext: { street: address.street, number: address.number, buildingType: "SINGLE" }
    };
  }

  async fetchSchedule(ctx: Record<string, string>): Promise<ProviderSchedule> {
    const { doc, source } = await this.loadDocument(true);
    const m = matchZoryZone(doc.zones, ctx.street, ctx.number || null);
    if (!m.ok) throw new ProviderError("VALIDATION_FAILED", `Po aktualizacji dokumentu adres nie ma jednoznacznego rejonu (${m.reason}).`);
    return {
      zoneKey: m.zone.id + ":" + fold(m.zone.label).replace(/\s+/g, "-"),
      zoneLabel: m.zone.label,
      events: m.zone.events, onDemand: [],
      source, coverage: "FULL_PERIOD", periodEnd: `${doc.year}-12-31`,
      notes: ["Terminy odczytane automatycznie z oficjalnego PDF i zwalidowane (daty, kolumny miesięcy, kompletność)."]
    };
  }
}
