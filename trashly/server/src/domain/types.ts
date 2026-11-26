// Typy domenowe Trashly.

/** Status zaufania do harmonogramu. */
export type TrustStatus = "VERIFIED" | "UPDATED" | "STALE" | "UNAVAILABLE" | "UNCONFIRMED";

/** Poziom weryfikacji adresu. Nigdy nie twierdzimy więcej, niż potwierdziło źródło. */
export type AddressLevel =
  | "BUILDING_VERIFIED"   // ulica i numer potwierdzone w rejestrze (PRG lub system gminy)
  | "STREET_VERIFIED"     // potwierdzona tylko ulica
  | "UNVERIFIED";         // nie udało się potwierdzić

export type SourceType = "API" | "HTML" | "PDF" | "REGISTRY";

/** Kanoniczne rodzaje odpadów – każdy provider mapuje swoje frakcje na te klucze. */
export type CategoryKey =
  | "zmieszane" | "plastik" | "papier" | "szklo" | "bio" | "zielone"
  | "segregowane" | "popiol" | "gabaryty" | "elektro" | "opony" | "choinki" | "liscie";

export interface CityInfo {
  id: string;               // „zory”, „warszawa”…
  name: string;             // „Żory”
  teryt: string;            // kod TERYT gminy (6 znaków, np. 247901)
  voivodeship: string;
  officialInfoUrl: string;  // strona gminy o odpadach
  capabilities: {
    streetAutocomplete: boolean;
    buildingValidation: boolean;
    /** Harmonogram zależy od typu zabudowy (jedno-/wielorodzinna) – użytkownik musi go wskazać. */
    buildingTypeRequired: boolean;
    schedule: "LIVE" | "PDF_INGEST" | "NOT_INTEGRATED";
  };
  /** Zasady wystawiania – tylko jeśli podaje je oficjalne źródło. */
  rules: { setOutBy: string | null; setOutSource: string | null };
  integrationNote: string | null;
}

export type BuildingType = "SINGLE" | "MULTI";

export interface AddressInput {
  city: string;       // id miasta
  street: string;
  number: string;
  apartment?: string;
  buildingType?: BuildingType;
}

export interface ResolvedAddress {
  cityId: string;
  street: string;          // oficjalna nazwa ulicy
  number: string;
  apartment: string | null;
  buildingType?: BuildingType | null;
  level: AddressLevel;
  /** Identyfikatory urzędowe, jeśli znane. */
  ids: { teryt?: string; simc?: string; ulic?: string; providerId?: string };
  postalCode?: string | null;
  location?: { x: number; y: number; crs: "EPSG:2180" } | null;
  verifiedBy: string[];    // np. ["PRG (GUGiK)", "System harmonogramów m.st. Warszawy"]
}

export interface CollectionEvent {
  date: string;              // RRRR-MM-DD
  category: CategoryKey;
  rawName: string;           // nazwa frakcji w źródle
  onDemand?: boolean;        // „na zgłoszenie” – bez daty
}

export interface ScheduleSource {
  url: string;
  type: SourceType;
  title: string;
}

/** Wynik pobrania harmonogramu przez providera (przed zapisaniem wersji). */
export interface ProviderSchedule {
  zoneKey: string;           // stabilny klucz strefy/punktu adresowego
  zoneLabel: string;         // np. „Rejon 3”, „Punkt adresowy 27044650”
  events: CollectionEvent[];
  onDemand: CategoryKey[];   // frakcje odbierane na zgłoszenie
  source: ScheduleSource;
  /** Ile dni naprzód źródło publikuje dane (Warszawa: tylko najbliższy termin). */
  coverage: "NEXT_ONLY" | "FULL_PERIOD";
  periodEnd: string | null;
  notes: string[];
}

export interface ScheduleChange {
  category: CategoryKey;
  from: string | null;
  to: string | null;
  detectedAt: string;
}

export interface StoredSchedule {
  key: string;               // `${cityId}:${zoneKey}`
  cityId: string;
  zoneKey: string;
  zoneLabel: string;
  version: number;
  hash: string;
  events: CollectionEvent[];
  onDemand: CategoryKey[];
  source: ScheduleSource;
  coverage: "NEXT_ONLY" | "FULL_PERIOD";
  periodEnd: string | null;
  notes: string[];
  lastSuccessAt: string;     // ostatnie udane pobranie ze źródła (prawdziwy znacznik czasu)
  lastChangeAt: string | null;
  lastAttemptAt: string;
  lastError: string | null;
  failures: number;
  nextCheckAt: string;
  changes: ScheduleChange[];
  /** Adres, dla którego strefa była rozwiązana – potrzebny do odświeżenia. */
  refreshContext: Record<string, string>;
}

export interface ScheduleResponse {
  status: TrustStatus;
  message: string;
  address: ResolvedAddress | null;
  schedule: (Omit<StoredSchedule, "refreshContext" | "failures" | "nextCheckAt"> & { upcoming: CollectionEvent[] }) | null;
  officialInfoUrl: string;
}

export class ProviderError extends Error {
  code: "SOURCE_UNAVAILABLE" | "RATE_LIMITED" | "PARSE_ERROR" | "VALIDATION_FAILED" | "NOT_FOUND" | "NOT_INTEGRATED";
  retryable: boolean;
  constructor(code: ProviderError["code"], message: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}
