import type { CityInfo } from "../domain/types.ts";

// Konfiguracja obsługiwanych gmin. Kody TERYT pochodzą z odpowiedzi rejestru PRG (GUGiK).
// Dodanie miasta = nowy wpis tutaj + provider w providers/index.ts.

export const CITIES: Record<string, CityInfo & { pszokUrl: string | null }> = {
  zory: {
    id: "zory", name: "Żory", teryt: "247901", voivodeship: "śląskie",
    officialInfoUrl: "https://www.zory.pl/dla-mieszkancow/gospodarka-odpadami/harmonogramy",
    pszokUrl: "https://www.zory.pl/dla-mieszkancow/gospodarka-odpadami/pszok",
    capabilities: { streetAutocomplete: true, buildingValidation: true, buildingTypeRequired: true, schedule: "PDF_INGEST" },
    rules: { setOutBy: null, setOutSource: null },
    integrationNote: "Harmonogram dla zabudowy jednorodzinnej pobierany z oficjalnego PDF Urzędu Miasta Żory i automatycznie przetwarzany. Zabudowa wielorodzinna ma osobne harmonogramy (pliki DOCX) – ta integracja nie jest jeszcze gotowa. Numery budynków weryfikujemy w rejestrze PRG."
  },
  jastrzebie: {
    id: "jastrzebie", name: "Jastrzębie-Zdrój", teryt: "246701", voivodeship: "śląskie",
    officialInfoUrl: "https://www.jastrzebie.pl/dla-mieszkanca/gospodarka-odpadami-komunalnymi/harmonogramy",
    pszokUrl: "https://www.jastrzebie.pl/dla-mieszkanca/gospodarka-odpadami-komunalnymi/punkty-pszok",
    capabilities: { streetAutocomplete: false, buildingValidation: true, buildingTypeRequired: false, schedule: "NOT_INTEGRATED" },
    rules: { setOutBy: "06:00", setOutSource: "Harmonogram UM Jastrzębie-Zdrój 2026 (PDF)" },
    integrationNote: "Miasto publikuje harmonogramy wyłącznie jako PDF, w którym dni odbioru są zaznaczone kolorem komórek kalendarza. Tego nie da się wiarygodnie odczytać automatycznie, dlatego nie pokazujemy terminów – kierujemy do oficjalnego dokumentu."
  },
  rybnik: {
    id: "rybnik", name: "Rybnik", teryt: "247301", voivodeship: "śląskie",
    officialInfoUrl: "https://www.rybnik.eu/dla-mieszkancow/odpady-komunalne/harmonogramy-odbioru-2026",
    pszokUrl: "https://www.rybnik.eu/dla-mieszkancow/odpady-komunalne/punkty-zbiorki-odpadow-pszok",
    capabilities: { streetAutocomplete: false, buildingValidation: true, buildingTypeRequired: false, schedule: "NOT_INTEGRATED" },
    rules: { setOutBy: "06:00", setOutSource: "Harmonogram Miasta Rybnika 2026 (PDF)" },
    integrationNote: "Rybnik publikuje osobne PDF-y dla dzielnic, z podrejonami (np. „Boguszowice 1–5”), których przypisania do ulic nie da się jeszcze automatycznie i jednoznacznie odczytać. Do czasu ukończenia i zweryfikowania tej integracji nie pokazujemy terminów."
  },
  warszawa: {
    id: "warszawa", name: "Warszawa", teryt: "146501", voivodeship: "mazowieckie",
    officialInfoUrl: "https://warszawa19115.pl/harmonogramy-wywozu-odpadow",
    pszokUrl: null,
    capabilities: { streetAutocomplete: true, buildingValidation: true, buildingTypeRequired: false, schedule: "LIVE" },
    rules: { setOutBy: null, setOutSource: null },
    integrationNote: "Dane z oficjalnej wyszukiwarki harmonogramów m.st. Warszawy (Warszawa 19115). Źródło podaje najbliższy termin dla każdej frakcji."
  },
  poznan: {
    id: "poznan", name: "Poznań", teryt: "306401", voivodeship: "wielkopolskie",
    officialInfoUrl: "https://www.poznan.pl/mim/odpady/harmonogramy.html",
    pszokUrl: "https://goap.org.pl/",
    capabilities: { streetAutocomplete: true, buildingValidation: true, buildingTypeRequired: false, schedule: "LIVE" },
    rules: { setOutBy: null, setOutSource: null },
    integrationNote: "Dane z oficjalnej wyszukiwarki harmonogramów Miasta Poznania (poznan.pl). Źródło publikuje terminy na cały rok."
  }
};

export function getCity(id: string) {
  return Object.prototype.hasOwnProperty.call(CITIES, id) ? CITIES[id] : null;
}
