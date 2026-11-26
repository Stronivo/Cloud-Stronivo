// Operacje na datach kalendarzowych (bez stref czasowych – daty odbioru są „dniami”).

export const MONTHS_PL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];

export function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Sprawdza, czy napis to poprawna data RRRR-MM-DD (np. odrzuca 2026-02-30). */
export function isValidIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

/** Dzisiejsza data w strefie Europe/Warsaw. */
export function todayWarsaw(now = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return p; // en-CA daje RRRR-MM-DD
}

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function diffDaysIso(a: string, b: string): number {
  const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 864e5);
}

/** Parsuje listę dni z komórki tabeli: „2, 23” / „3;17” / „02, 09, 15”. */
export function parseDayList(cell: string): number[] {
  const t = cell.trim();
  if (!t || t === "-") return [];
  if (!/^\d{1,2}(\s*[,;]\s*\d{1,2})*$/.test(t)) throw new Error(`Nieoczekiwany format dni: „${cell}”`);
  return t.split(/[,;]/).map(x => Number(x.trim()));
}
