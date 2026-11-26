import { HttpClient } from "../lib/http.ts";
import { extractPdfLinks } from "../lib/pdf.ts";
import { normNumber } from "../lib/text.ts";
import { CITIES } from "./cities.ts";
import { intervalFromEnv, type ScheduleProvider, type StreetSuggestion, type ZoneLocation } from "./provider.ts";
import { ProviderError, type AddressInput, type CityInfo, type ProviderSchedule, type ResolvedAddress, type ScheduleSource } from "../domain/types.ts";
import type { AddressRegistry } from "../address/prg.ts";

// Gminy, które publikują harmonogramy wyłącznie w PDF, których nie umiemy jeszcze
// wiarygodnie przetworzyć (Rybnik, Jastrzębie-Zdrój). PLACEHOLDER INTEGRACJI:
//  • adres JEST walidowany w PRG (ulica + budynek),
//  • lista oficjalnych PDF jest monitorowana (job wykrywa nowe/zmienione pliki),
//  • terminów NIE pokazujemy – użytkownik dostaje status UNCONFIRMED i link do dokumentu.

export class PdfOnlyProvider implements ScheduleProvider {
  readonly city: CityInfo;
  readonly updateIntervalHours: number;
  readonly staleAfterHours = 24 * 7;
  private http: HttpClient;
  private registry: AddressRegistry;
  private linkFilter: RegExp;

  constructor(cityId: "rybnik" | "jastrzebie", http: HttpClient, registry: AddressRegistry, linkFilter: RegExp) {
    this.city = CITIES[cityId];
    this.updateIntervalHours = intervalFromEnv(cityId, 24);
    this.http = http; this.registry = registry; this.linkFilter = linkFilter;
  }

  async listSources(): Promise<ScheduleSource[]> {
    const page = await this.http.request({ url: this.city.officialInfoUrl, cacheTtlMs: 3600_000 });
    return extractPdfLinks(page.text, this.city.officialInfoUrl)
      .filter(l => this.linkFilter.test(l.url))
      .map(l => ({ url: l.url, type: "PDF" as const, title: l.title }));
  }

  async suggestStreets(): Promise<StreetSuggestion[]> { return []; }
  async suggestNumbers(): Promise<null> { return null; }

  async resolve(input: AddressInput): Promise<ResolvedAddress> {
    const number = normNumber(input.number || "");
    const street = await this.registry.findStreet(this.city, input.street);
    if (!street) throw new ProviderError("NOT_FOUND", `Nie znaleźliśmy ulicy „${input.street}” w ${this.city.name} w Państwowym Rejestrze Granic (PRG). Sprawdź pisownię – wpisz pełną nazwę ulicy.`);
    const addr: ResolvedAddress = {
      cityId: this.city.id, street: street.street, number, apartment: input.apartment?.trim() || null, buildingType: input.buildingType ?? null,
      level: "STREET_VERIFIED", ids: { teryt: street.teryt, simc: street.simc, ulic: street.ulic },
      postalCode: null, location: null, verifiedBy: ["PRG (GUGiK)"]
    };
    if (number) {
      const a = await this.registry.findAddress(this.city, street.street, number);
      if (!a) throw new ProviderError("NOT_FOUND", `Nie znaleźliśmy budynku ${number} przy ulicy ${street.street} w PRG.`);
      addr.level = "BUILDING_VERIFIED";
      addr.number = a.number;
      addr.postalCode = a.postalCode;
      addr.location = { x: a.x, y: a.y, crs: "EPSG:2180" };
    }
    return addr;
  }

  async locate(): Promise<ZoneLocation> {
    throw new ProviderError("NOT_INTEGRATED", this.city.integrationNote ?? "Integracja harmonogramu dla tego miasta nie jest jeszcze gotowa.");
  }

  async fetchSchedule(): Promise<ProviderSchedule> {
    throw new ProviderError("NOT_INTEGRATED", this.city.integrationNote ?? "Integracja harmonogramu dla tego miasta nie jest jeszcze gotowa.");
  }
}

export const rybnikProvider = (http: HttpClient, reg: AddressRegistry) =>
  new PdfOnlyProvider("rybnik", http, reg, /Harmonogramy_\d{4}\/(zamieszkale|Wielorodzinna)|\/\d_-_/i);
export const jastrzebieProvider = (http: HttpClient, reg: AddressRegistry) =>
  new PdfOnlyProvider("jastrzebie", http, reg, /Harmonogram_na_\d{4}_rok/i);
