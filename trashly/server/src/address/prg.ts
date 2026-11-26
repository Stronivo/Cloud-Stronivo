import { HttpClient } from "../lib/http.ts";
import { normNumber, sameStreet } from "../lib/text.ts";
import type { CityInfo } from "../domain/types.ts";

// Walidacja adresów w Państwowym Rejestrze Granic i adresów (PRG) przez usługę
// GUGiK UUG (services.gugik.gov.pl/uug). Usługa jest publiczna i bezpłatna.
// UWAGA: UUG dopasowuje nazwy „rozmyto” (np. „Krucza 10” → „Krupnicza 10”),
// dlatego każdy wynik sprawdzamy ściśle sami: TERYT gminy, znormalizowana nazwa ulicy i numer.

export const UUG_URL = "https://services.gugik.gov.pl/uug/";

export interface PrgStreetMatch { street: string; teryt: string; simc: string; ulic: string; }
export interface PrgAddressMatch extends PrgStreetMatch { number: string; postalCode: string | null; x: number; y: number; }

export interface AddressRegistry {
  readonly name: string;
  findStreet(city: CityInfo, street: string): Promise<PrgStreetMatch | null>;
  findAddress(city: CityInfo, street: string, number: string): Promise<PrgAddressMatch | null>;
}

type UugResult = Record<string, string | null>;

export class PrgRegistry implements AddressRegistry {
  readonly name = "PRG – Państwowy Rejestr Granic (GUGiK)";
  private http: HttpClient;
  constructor(http: HttpClient) { this.http = http; }

  private async query(text: string): Promise<{ type: string; results: UugResult[] }> {
    const url = `${UUG_URL}?request=GetAddress&address=${encodeURIComponent(text)}`;
    const res = await this.http.request({ url, cacheTtlMs: 24 * 3600_000 });
    let json: { type?: string; results?: Record<string, UugResult> | null };
    try { json = JSON.parse(res.text); } catch { return { type: "error", results: [] }; }
    return { type: json.type ?? "", results: json.results ? Object.values(json.results) : [] };
  }

  /** Czy wynik należy do wybranej gminy? Porównujemy kod TERYT (pierwsze 6 znaków). */
  private inCity(r: UugResult, city: CityInfo): boolean {
    return typeof r.teryt === "string" && r.teryt.slice(0, 6) === city.teryt;
  }

  async findStreet(city: CityInfo, street: string): Promise<PrgStreetMatch | null> {
    const { type, results } = await this.query(`${city.name}, ${street}`);
    if (type !== "street") return null;
    const hit = results.find(r => this.inCity(r, city) && sameStreet(String(r.street), street));
    return hit ? { street: String(hit.street), teryt: String(hit.teryt), simc: String(hit.simc), ulic: String(hit.ulic) } : null;
  }

  async findAddress(city: CityInfo, street: string, number: string): Promise<PrgAddressMatch | null> {
    const { type, results } = await this.query(`${city.name}, ${street} ${number}`);
    if (type !== "address") return null;
    const hit = results.find(r =>
      this.inCity(r, city) &&
      sameStreet(String(r.street), street) &&
      normNumber(String(r.number)) === normNumber(number)
    );
    if (!hit) return null;
    return {
      street: String(hit.street), teryt: String(hit.teryt), simc: String(hit.simc), ulic: String(hit.ulic),
      number: String(hit.number), postalCode: hit.code ?? null, x: Number(hit.x), y: Number(hit.y)
    };
  }
}
