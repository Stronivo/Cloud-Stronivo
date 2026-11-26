// Normalizacja polskich nazw ulic i numerów budynków.
// Wszystkie porównania adresów w systemie przechodzą przez te funkcje.

const PREFIXES = [
  "ulica", "ul", "aleja", "aleje", "al", "plac", "pl", "osiedle", "os", "rondo", "skwer",
  "bulwar", "bulw", "wybrzeze", "wyb", "trakt", "pasaz"
];

/** Usuwa diakrytyki (ł → l też), zmienia na małe litery, ujednolica spacje i myślniki. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Klucz porównawczy ulicy: bez prefiksu (ul., al., os.), bez diakrytyków. */
export function streetKey(name: string): string {
  let s = fold(name);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIXES) {
      if (s.startsWith(p + " ") && s.length > p.length + 1) {
        s = s.slice(p.length + 1);
        changed = true;
      }
    }
  }
  // Popularne skróty w nazwach patronów
  s = s
    .replace(/\bgen\b/g, "generala")
    .replace(/\bks\b/g, "ksiedza")
    .replace(/\bsw\b/g, "swietego")
    .replace(/\bbp\b/g, "biskupa")
    .replace(/\bpplk\b/g, "podpulkownika")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/**
 * Luźniejszy klucz: tylko ostatni człon nazwy (nazwisko patrona).
 * Używany wyłącznie do podpowiedzi, nigdy do potwierdzenia adresu.
 */
export function streetLooseKey(name: string): string {
  const k = streetKey(name).split(" ");
  return k[k.length - 1] || "";
}

/** Dwie nazwy ulic oznaczają tę samą ulicę (ścisłe porównanie po normalizacji). */
export function sameStreet(a: string, b: string): boolean {
  const ka = streetKey(a), kb = streetKey(b);
  if (ka === kb) return true;
  // „Marii Skłodowskiej-Curie” vs „Skłodowskiej-Curie” – pełne dopasowanie końcówki po granicy słowa
  // dopuszczamy tylko, gdy krótsza nazwa ma co najmniej 2 słowa lub 8 znaków (unikamy „Nowa” ≈ „Stara Nowa”)
  const [short, long] = ka.length < kb.length ? [ka, kb] : [kb, ka];
  if (short.length >= 8 && (long.endsWith(" " + short))) return true;
  return false;
}

/** Ujednolicony numer budynku: „12 a” → „12A”, „5/7” zostaje, spacje usunięte. */
export function normNumber(n: string): string {
  return n.toUpperCase().replace(/\s+/g, "").replace(/^NR/, "");
}

/** Rozbija numer na część liczbową i literę (do porównań zakresów). */
export function splitNumber(n: string): { num: number; suffix: string } | null {
  const m = normNumber(n).match(/^(\d+)([A-ZĄĆĘŁŃÓŚŹŻ]*)/);
  if (!m) return null;
  return { num: Number(m[1]), suffix: m[2] || "" };
}

/** Proste sprawdzenie formatu numeru budynku. */
export function isValidBuildingNumber(n: string): boolean {
  return /^\d{1,4}[A-ZĄĆĘŁŃÓŚŹŻ]{0,2}(\/\d{1,4}[A-Z]?)?(-\d{1,4}[A-Z]?)?$/.test(normNumber(n));
}

/** Escapowanie HTML przy budowaniu odpowiedzi tekstowych. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#160;|&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** Polski zapis kapitalikami („GŁOGOWSKA” → „Głogowska”). */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-(])([a-ząćęłńóśźż])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(I|Ii|Iii|Iv|Vi|Vii)\b/g, m => m.toUpperCase());
}
