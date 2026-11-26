import type { AddressInput, CityInfo, ProviderSchedule, ResolvedAddress, ScheduleSource } from "../domain/types.ts";

/** Wynik przypisania adresu do strefy odbioru. */
export interface ZoneLocation {
  zoneKey: string;
  zoneLabel: string;
  /** Dane potrzebne do ponownego pobrania harmonogramu (np. addressPointId). */
  refreshContext: Record<string, string>;
}

export interface StreetSuggestion { name: string; hint?: string; }

/**
 * Kontrakt providera gminy. Każde miasto ma własną implementację – nie ma
 * wspólnego „ogólnego” harmonogramu.
 */
export interface ScheduleProvider {
  readonly city: CityInfo;
  /** Co ile godzin job sprawdza źródło (konfigurowalne zmienną środowiskową). */
  readonly updateIntervalHours: number;
  /** Po ilu godzinach od ostatniego udanego pobrania dane uznajemy za nieaktualne. */
  readonly staleAfterHours: number;

  suggestStreets(q: string): Promise<StreetSuggestion[]>;
  /** null = źródło nie udostępnia listy numerów. */
  suggestNumbers(street: string, q: string): Promise<string[] | null>;

  /** Waliduje adres. Rzuca ProviderError("NOT_FOUND") z polskim komunikatem przy błędzie. */
  resolve(input: AddressInput): Promise<ResolvedAddress>;
  /** Ustala strefę odbioru dla adresu. Rzuca ProviderError, jeśli nie da się jej jednoznacznie ustalić. */
  locate(address: ResolvedAddress): Promise<ZoneLocation>;
  /** Pobiera i waliduje harmonogram strefy z oficjalnego źródła. */
  fetchSchedule(ctx: Record<string, string>): Promise<ProviderSchedule>;
  /** Oficjalne dokumenty/strony źródłowe (do „Szczegółów” i monitoringu zmian). */
  listSources(): Promise<ScheduleSource[]>;
}

/** Interwał z env, np. TRASHLY_ZORY_INTERVAL_H=12. */
export function intervalFromEnv(cityId: string, fallback: number): number {
  const v = Number(process.env[`TRASHLY_${cityId.toUpperCase()}_INTERVAL_H`]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
