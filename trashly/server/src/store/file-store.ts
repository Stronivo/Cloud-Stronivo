import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { StoredSchedule } from "../domain/types.ts";
import type { Notification, ScheduleVersionRecord, SourceDocument, Store, Subscription, UpdateLog } from "./store.ts";

// Magazyn w pliku JSON (lub w pamięci, gdy path = null). Do pracy lokalnej i testów.
// Zapis atomowy: plik tymczasowy + rename, żeby awaria nie zostawiła uszkodzonych danych.

interface Data {
  schedules: Record<string, StoredSchedule>;
  versions: ScheduleVersionRecord[];
  documents: Record<string, SourceDocument>;
  logs: UpdateLog[];
  subscriptions: Subscription[];
  notifications: Notification[];
}

const empty = (): Data => ({ schedules: {}, versions: [], documents: {}, logs: [], subscriptions: [], notifications: [] });

export class FileStore implements Store {
  private data: Data;
  private path: string | null;
  constructor(path: string | null) {
    this.path = path;
    this.data = empty();
    if (path) {
      try { this.data = { ...empty(), ...JSON.parse(readFileSync(path, "utf8")) }; } catch { /* brak pliku = pusty magazyn */ }
    }
  }
  private flush() {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = this.path + ".tmp";
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.path);
  }
  private clone<T>(x: T): T { return x == null ? x : structuredClone(x); }

  async getSchedule(key: string) { return this.clone(this.data.schedules[key] ?? null); }
  async putSchedule(s: StoredSchedule) { this.data.schedules[s.key] = this.clone(s); this.flush(); }
  async listSchedules() { return Object.values(this.data.schedules).map(s => this.clone(s)); }
  async addVersion(v: ScheduleVersionRecord) {
    // Unikamy duplikatów: ta sama wersja/hash zapisana tylko raz.
    if (this.data.versions.some(x => x.scheduleKey === v.scheduleKey && (x.version === v.version || x.hash === v.hash))) return;
    this.data.versions.push(this.clone(v)); this.flush();
  }
  async listVersions(key: string) { return this.data.versions.filter(v => v.scheduleKey === key).map(v => this.clone(v)); }
  async getDocument(url: string) { return this.clone(this.data.documents[url] ?? null); }
  async putDocument(d: SourceDocument) { this.data.documents[d.url] = this.clone(d); this.flush(); }
  async addLog(l: UpdateLog) { this.data.logs.push(l); if (this.data.logs.length > 2000) this.data.logs.splice(0, this.data.logs.length - 2000); this.flush(); }
  async listLogs(limit: number) { return this.data.logs.slice(-limit).reverse(); }
  async upsertSubscription(s: Subscription) {
    const i = this.data.subscriptions.findIndex(x => x.deviceId === s.deviceId && x.scheduleKey === s.scheduleKey);
    if (i >= 0) this.data.subscriptions[i] = this.clone(s); else this.data.subscriptions.push(this.clone(s));
    this.flush();
  }
  async listSubscriptions(scheduleKey: string) { return this.data.subscriptions.filter(s => s.scheduleKey === scheduleKey).map(s => this.clone(s)); }
  async addNotification(n: Notification) { this.data.notifications.push(this.clone(n)); this.flush(); }
  async listNotifications(deviceId: string) { return this.data.notifications.filter(n => n.deviceId === deviceId).slice(-50).reverse().map(n => this.clone(n)); }
}
