import type { StoredSchedule } from "../domain/types.ts";
import type { Notification, ScheduleVersionRecord, SourceDocument, Store, Subscription, UpdateLog } from "./store.ts";

// Magazyn Supabase przez REST (PostgREST). Używa klucza service_role – tylko po stronie serwera.
// Schemat: supabase/migrations/20261126120000_trashly_init.sql

export class SupabaseStore implements Store {
  private url: string;
  private key: string;
  constructor(url: string, serviceRoleKey: string) { this.url = url.replace(/\/$/, "") + "/rest/v1"; this.key = serviceRoleKey; }

  private async req<T>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
    const res = await fetch(`${this.url}/${path}`, {
      method: init.method ?? "GET",
      headers: {
        apikey: this.key, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json",
        ...(init.prefer ? { Prefer: init.prefer } : {})
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body)
    });
    if (!res.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]}: ${res.status} ${await res.text()}`);
    const t = await res.text();
    return (t ? JSON.parse(t) : null) as T;
  }
  private upsert(table: string, rows: unknown, onConflict: string) {
    return this.req(`${table}?on_conflict=${onConflict}`, { method: "POST", body: rows, prefer: "resolution=merge-duplicates,return=minimal" });
  }

  private toRow(s: StoredSchedule) {
    return {
      key: s.key, municipality_id: s.cityId, zone_key: s.zoneKey, zone_label: s.zoneLabel, version: s.version, hash: s.hash,
      events: s.events, on_demand: s.onDemand, source: s.source, coverage: s.coverage, period_end: s.periodEnd, notes: s.notes,
      last_success_at: s.lastSuccessAt, last_change_at: s.lastChangeAt, last_attempt_at: s.lastAttemptAt, last_error: s.lastError,
      failures: s.failures, next_check_at: s.nextCheckAt, changes: s.changes, refresh_context: s.refreshContext
    };
  }
  private fromRow(r: Record<string, any>): StoredSchedule {
    return {
      key: r.key, cityId: r.municipality_id, zoneKey: r.zone_key, zoneLabel: r.zone_label, version: r.version, hash: r.hash,
      events: r.events, onDemand: r.on_demand, source: r.source, coverage: r.coverage, periodEnd: r.period_end, notes: r.notes,
      lastSuccessAt: r.last_success_at, lastChangeAt: r.last_change_at, lastAttemptAt: r.last_attempt_at, lastError: r.last_error,
      failures: r.failures, nextCheckAt: r.next_check_at, changes: r.changes, refreshContext: r.refresh_context
    };
  }

  async getSchedule(key: string) {
    const rows = await this.req<Record<string, any>[]>(`collection_schedules?key=eq.${encodeURIComponent(key)}&select=*`);
    return rows[0] ? this.fromRow(rows[0]) : null;
  }
  async putSchedule(s: StoredSchedule) {
    await this.upsert("collection_schedules", this.toRow(s), "key");
    // Relacyjna kopia terminów bieżącej wersji (unikalność w bazie chroni przed duplikatami).
    await this.req(`collection_events?schedule_key=eq.${encodeURIComponent(s.key)}&version=neq.${s.version}`, { method: "DELETE" });
    if (s.events.length) {
      await this.upsert("collection_events", s.events.map(e => ({ schedule_key: s.key, version: s.version, date: e.date, category: e.category, raw_name: e.rawName })), "schedule_key,version,date,category");
    }
  }
  async listSchedules() {
    return (await this.req<Record<string, any>[]>("collection_schedules?select=*")).map(r => this.fromRow(r));
  }
  async addVersion(v: ScheduleVersionRecord) {
    await this.req("schedule_versions?on_conflict=schedule_key,version", { method: "POST", body: { schedule_key: v.scheduleKey, version: v.version, hash: v.hash, events: v.events, saved_at: v.savedAt }, prefer: "resolution=ignore-duplicates,return=minimal" });
  }
  async listVersions(key: string) {
    const rows = await this.req<Record<string, any>[]>(`schedule_versions?schedule_key=eq.${encodeURIComponent(key)}&order=version`);
    return rows.map(r => ({ scheduleKey: r.schedule_key, version: r.version, hash: r.hash, events: r.events, savedAt: r.saved_at }));
  }
  async getDocument(url: string) {
    const rows = await this.req<Record<string, any>[]>(`source_documents?url=eq.${encodeURIComponent(url)}`);
    const r = rows[0];
    return r ? { url: r.url, cityId: r.municipality_id, sha256: r.sha256, fetchedAt: r.fetched_at, firstSeenAt: r.first_seen_at, parsed: r.parsed, parseErrors: r.parse_errors } : null;
  }
  async putDocument(d: SourceDocument) {
    await this.upsert("source_documents", { url: d.url, municipality_id: d.cityId, sha256: d.sha256, fetched_at: d.fetchedAt, first_seen_at: d.firstSeenAt, parsed: d.parsed, parse_errors: d.parseErrors }, "url");
  }
  async addLog(l: UpdateLog) {
    await this.req("update_logs", { method: "POST", body: { at: l.at, municipality_id: l.cityId, schedule_key: l.scheduleKey, outcome: l.outcome, message: l.message, duration_ms: l.durationMs }, prefer: "return=minimal" });
  }
  async listLogs(limit: number) {
    const rows = await this.req<Record<string, any>[]>(`update_logs?order=at.desc&limit=${limit}`);
    return rows.map(r => ({ at: r.at, cityId: r.municipality_id, scheduleKey: r.schedule_key, outcome: r.outcome, message: r.message, durationMs: r.duration_ms }));
  }
  async upsertSubscription(s: Subscription) {
    await this.upsert("notification_preferences", { device_id: s.deviceId, schedule_key: s.scheduleKey, address: s.address, prefs: s.prefs, created_at: s.createdAt }, "device_id,schedule_key");
  }
  async listSubscriptions(scheduleKey: string) {
    const rows = await this.req<Record<string, any>[]>(`notification_preferences?schedule_key=eq.${encodeURIComponent(scheduleKey)}`);
    return rows.map(r => ({ deviceId: r.device_id, scheduleKey: r.schedule_key, address: r.address, prefs: r.prefs, createdAt: r.created_at }));
  }
  async addNotification(n: Notification) {
    await this.req("notifications", { method: "POST", body: { id: n.id, device_id: n.deviceId, schedule_key: n.scheduleKey, type: n.type, title: n.title, body: n.body, changes: n.changes, created_at: n.createdAt, read_at: n.readAt }, prefer: "return=minimal" });
  }
  async listNotifications(deviceId: string) {
    const rows = await this.req<Record<string, any>[]>(`notifications?device_id=eq.${encodeURIComponent(deviceId)}&order=created_at.desc&limit=50`);
    return rows.map(r => ({ id: r.id, deviceId: r.device_id, scheduleKey: r.schedule_key, type: r.type, title: r.title, body: r.body, changes: r.changes, createdAt: r.created_at, readAt: r.read_at }));
  }
}
