import type { CategoryKey } from "./types.ts";
import { fold } from "../lib/text.ts";

// Kolory pojemników zgodne z rozporządzeniem Ministra Środowiska z 29.12.2016 r.
// w sprawie selektywnego zbierania (JSSO) – obowiązują w całej Polsce:
// papier – niebieski, szkło – zielony, metale i tworzywa – żółty, bio – brązowy.
// Dla odpadów zmieszanych przepisy nie narzucają koloru, więc go NIE podajemy.
export interface CategoryDef {
  key: CategoryKey;
  name: string;
  container: string;       // opis pojemnika/worka
  color: string | null;    // null = kolor nieokreślony przepisami
  legalBasis: string | null;
}

const JSSO = "Rozporządzenie MŚ z 29.12.2016 r. (Dz.U. 2017 poz. 19)";

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  zmieszane:   { key: "zmieszane", name: "Odpady zmieszane", container: "Pojemnik na odpady zmieszane", color: null, legalBasis: null },
  plastik:     { key: "plastik", name: "Metale i tworzywa sztuczne", container: "Żółty worek lub pojemnik", color: "#F2C230", legalBasis: JSSO },
  papier:      { key: "papier", name: "Papier", container: "Niebieski worek lub pojemnik", color: "#2F6FD6", legalBasis: JSSO },
  szklo:       { key: "szklo", name: "Szkło", container: "Zielony worek lub pojemnik", color: "#2E9A5B", legalBasis: JSSO },
  bio:         { key: "bio", name: "Bioodpady", container: "Brązowy pojemnik lub worek", color: "#8A5A35", legalBasis: JSSO },
  zielone:     { key: "zielone", name: "Odpady zielone", container: "Brązowy pojemnik lub worek", color: "#5E8C3A", legalBasis: JSSO },
  segregowane: { key: "segregowane", name: "Papier, plastik i szkło", container: "Worki: niebieski, żółty i zielony", color: "#3E7CB1", legalBasis: JSSO },
  popiol:      { key: "popiol", name: "Popiół", container: "Osobny pojemnik na popiół", color: null, legalBasis: null },
  gabaryty:    { key: "gabaryty", name: "Odpady wielkogabarytowe", container: "Wystaw przy posesji", color: null, legalBasis: null },
  elektro:     { key: "elektro", name: "Elektroodpady", container: "Wystaw przy posesji", color: null, legalBasis: null },
  opony:       { key: "opony", name: "Opony", container: "Wystaw przy posesji", color: null, legalBasis: null },
  choinki:     { key: "choinki", name: "Choinki", container: "Wystaw przy posesji", color: null, legalBasis: null },
  liscie:      { key: "liscie", name: "Liście", container: "Worki z liśćmi", color: null, legalBasis: null }
};

/**
 * Mapowanie nazw frakcji ze źródeł na kategorie kanoniczne.
 * Zwraca null, jeśli frakcja jest nieznana – wtedy provider zgłasza błąd walidacji,
 * zamiast po cichu zgadywać.
 */
export function mapCategory(raw: string): CategoryKey | null {
  const s = fold(raw);
  const rules: [RegExp, CategoryKey][] = [
    [/niesegregowane|zmieszane odpady komunalne|^odpady zmieszane$|^zmieszane$/, "zmieszane"],
    [/^papier\/plastik\/szklo$|papier, plastik i szklo/, "segregowane"],
    [/zmieszane odpady opakowaniowe|metale i tworzywa|tworzywa sztuczne|^plastik/, "plastik"],
    [/papier|tektur/, "papier"],
    [/szkl/, "szklo"],
    [/kuchenne|bioodpady|^bio$/, "bio"],
    [/zielone|ulegajace biodegradacji/, "zielone"],
    [/popiol|zuzel/, "popiol"],
    [/wielkogabaryt|gabaryt|wystawkowe/, "gabaryty"],
    [/elektro/, "elektro"],
    [/opony/, "opony"],
    [/choinki|drzewka/, "choinki"],
    [/liscie|lisc/, "liscie"]
  ];
  for (const [re, key] of rules) if (re.test(s)) return key;
  return null;
}
