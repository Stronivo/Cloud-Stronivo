import type { CategoryKey, ResolvedAddress, ScheduleChange, StoredSchedule } from "../domain/types.ts";

// Abstrakcja magazynu danych. Implementacje: FileStore (lokalnie/testy) i SupabaseStore (produkcja).

export interface SourceDocument {
  url: string;
  cityId: string;
  sha256: string;
  fetchedAt: string;         // kiedy pobraliśmy plik
  firstSeenAt: string;       // kiedy pierwszy raz zobaczyliśmy tę wersję (hash)
  parsed: unknown | null;    // wynik parsera (np. ZoryDocument) albo null
  parseErrors: string[];
}

export interface UpdateLog {
  at: string;
  cityId: string;
  scheduleKey: string | null;
  outcome: "UNCHANGED" | "NEW_VERSION" | "FAILED" | "SOURCE_CHANGED" | "REJECTED";
  message: string;
  durationMs: number;
}

export interface NotificationPrefs { eveningBefore: boolean; eveningTime: string; collectionDay: boolean; morningTime: string; scheduleChanges: boolean; }

export interface Subscription {
  deviceId: string;
  scheduleKey: string;
  address: ResolvedAddress;
  prefs: NotificationPrefs;
  createdAt: string;
}

export interface Notification {
  id: string;
  deviceId: string;
  scheduleKey: string;
  type: "SCHEDULE_CHANGED";
  title: string;
  body: string;
  changes: ScheduleChange[];
  createdAt: string;
  readAt: string | null;
}

export interface ScheduleVersionRecord {
  scheduleKey: string;
  version: number;
  hash: string;
  events: { date: string; category: CategoryKey }[];
  savedAt: string;
}

export interface Store {
  getSchedule(key: string): Promise<StoredSchedule | null>;
  putSchedule(s: StoredSchedule): Promise<void>;
  listSchedules(): Promise<StoredSchedule[]>;
  /** Zachowuje poprzednią wersję harmonogramu (historia). */
  addVersion(v: ScheduleVersionRecord): Promise<void>;
  listVersions(key: string): Promise<ScheduleVersionRecord[]>;

  getDocument(url: string): Promise<SourceDocument | null>;
  putDocument(d: SourceDocument): Promise<void>;

  addLog(l: UpdateLog): Promise<void>;
  listLogs(limit: number): Promise<UpdateLog[]>;

  upsertSubscription(s: Subscription): Promise<void>;
  listSubscriptions(scheduleKey: string): Promise<Subscription[]>;
  addNotification(n: Notification): Promise<void>;
  listNotifications(deviceId: string): Promise<Notification[]>;
}
