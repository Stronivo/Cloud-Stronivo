# Trashly – harmonogram odbioru odpadów

Aplikacja dla mieszkańców: pod podanym adresem pokazuje, kiedy i jakie odpady są odbierane, który worek lub pojemnik przygotować i co zrobić dziś.
Dane pochodzą **wyłącznie z oficjalnych źródeł gmin**. Każdy harmonogram ma źródło, typ źródła, prawdziwy czas ostatniej weryfikacji, wersję i status zaufania.
Gdy czegoś nie da się potwierdzić, aplikacja mówi o tym wprost i nie wymyśla dat.

```
trashly/
├── index.html                  frontend (jeden plik, bez frameworków)
├── assets/                     logo, favicon
├── server/                     backend Node 22 (TypeScript bez kompilacji, zero zależności)
│   ├── src/address/prg.ts      walidacja adresów w PRG (GUGiK UUG)
│   ├── src/providers/          jeden provider na gminę + parser PDF Żor
│   ├── src/services/           dopasowanie, wersjonowanie, zmiany, statusy
│   ├── src/store/              magazyn: plik JSON (lokalnie) lub Supabase (produkcja)
│   ├── src/http/server.ts      API + serwowanie frontendu
│   ├── src/jobs/run-update.ts  job aktualizacji (cron)
│   ├── data/guide.json         przewodnik „Co gdzie wyrzucić?”
│   └── test/                   testy (node:test) + prawdziwe odpowiedzi źródeł jako fixtures
└── supabase/                   migracja schematu (RLS) i dane słownikowe
```

## Uruchomienie lokalne

Wymagania: Node.js ≥ 22.18 (natywne uruchamianie `.ts`) oraz `pdftotext` (poppler-utils), który jest potrzebny dla Żor.

```bash
sudo apt-get install -y poppler-utils      # macOS: brew install poppler
cd trashly/server
npm start                                  # http://localhost:8787
npm test                                   # 42 testy, bez dostępu do sieci
```

Za proxy HTTP(S) dodaj `NODE_USE_ENV_PROXY=1`, bo wbudowany `fetch` Node domyślnie nie czyta `HTTPS_PROXY`.

Frontend wymaga backendu. Otwarty jako sam plik (`file://`) pokaże komunikat, że brak połączenia z serwerem.

## Obsługiwane miasta i źródła (stan na 26.11.2026)

| Miasto | Źródło harmonogramu | Walidacja adresu | Status integracji |
|---|---|---|---|
| **Warszawa** | Oficjalna wyszukiwarka Warszawa 19115 (te same zapytania co strona) | Rejestr punktów adresowych miasta, na poziomie budynku | ✅ działa. Źródło podaje tylko **najbliższy** termin każdej frakcji |
| **Poznań** | Oficjalna wyszukiwarka poznan.pl (tabela roczna) | System harmonogramów miasta (ulica + numer) oraz PRG | ✅ działa, terminy na cały rok |
| **Żory** | Oficjalny PDF UM Żory, **zabudowa jednorodzinna**: pobranie, SHA-256, `pdftotext -bbox`, parser, walidacja | Ulica z PDF, budynek w PRG | ✅ dla domów jednorodzinnych (45/45 rejonów zwalidowanych) |
| Żory – zabudowa wielorodzinna | Osobne pliki DOCX dla każdej frakcji | jw. | ⏳ **brak integracji**: status UNCONFIRMED i link do źródła |
| **Rybnik** | PDF-y dzielnic z podrejonami | PRG, na poziomie budynku | ⏳ **placeholder**: monitorujemy listę PDF, terminów nie pokazujemy |
| **Jastrzębie-Zdrój** | PDF-y, w których dni odbioru są zaznaczone **kolorem** komórek | PRG, na poziomie budynku | ⏳ **placeholder**: kolorów nie da się wiarygodnie odczytać z tekstu |

Czego brakuje do pełnej integracji:
- **Rybnik:** potrzebne jest przypisanie ulic do podrejonów („Boguszowice 1–5”). Jeśli nie ma go w PDF, trzeba je pozyskać z urzędu lub operatora (EKO Rybnik, aplikacja halo! Rybnik). Można też zapytać urząd o udostępnienie danych w formie otwartej.
- **Jastrzębie-Zdrój:** wymagany jest parser rysowanych prostokątów PDF (kolory komórek) albo dane od miasta. Aplikacja EcoHarmonogram nie ma publicznego API.
- **Żory, zabudowa wielorodzinna:** potrzebny jest parser DOCX (np. przez `unzip` + XML), osobny dla każdej frakcji.

### Ważne ustalenia z prawdziwych źródeł
- Usługa adresowa UUG (GUGiK) dopasowuje adresy **rozmyto**: zapytanie „Warszawa, Krucza 10” zwraca „Krupnicza 10”. Każdy wynik weryfikujemy więc sami: zgodny kod TERYT gminy, ta sama ulica po normalizacji i ten sam numer.
- W PDF Żor etykiety „Rejon 1 utrudniony” powtarzają się w różnych sekcjach, za każdym razem z **innymi** terminami. Strefą jest zatem blok dokumentu, a nie sama nazwa.
- Jeśli blok PDF nie przejdzie walidacji, ulice z tego bloku dostają status UNCONFIRMED. Nie spadają po cichu do ogólnego rejonu, bo mogłyby zawierać wyjątek dla danego budynku.

## Statusy zaufania

| Status | Znaczenie |
|---|---|
| `VERIFIED` | Harmonogram potwierdzony w oficjalnym źródle i świeży |
| `UPDATED` | Ostatnie odświeżenie przyniosło nową wersję (zmianę terminów), w ciągu ostatnich 7 dni |
| `STALE` | Ostatnie udane potwierdzenie jest starsze niż próg danego providera (Warszawa 48 h, Poznań 72 h, Żory 7 dni) |
| `UNAVAILABLE` | Źródło jest niedostępne i nie mamy wcześniej potwierdzonej wersji |
| `UNCONFIRMED` | Adres rozpoznany, ale harmonogramu nie da się jednoznacznie potwierdzić |

Poziom weryfikacji adresu zapisujemy osobno: `BUILDING_VERIFIED`, `STREET_VERIFIED` (np. gdy PRG nie odpowiada) lub `UNVERIFIED`. Aplikacja nie twierdzi, że budynek jest zweryfikowany, jeśli potwierdzono tylko ulicę.

## Aktualizacje
- Każdy harmonogram ma własny `next_check_at`, liczony według interwału providera. Interwał można zmienić zmienną `TRASHLY_<MIASTO>_INTERVAL_H` (domyślnie Warszawa 12 h, pozostałe 24 h).
- Job: `node src/jobs/run-update.ts`, np. z crona co 30 minut. Częste uruchamianie nie zwiększa liczby zapytań do źródeł. Alternatywnie `TRASHLY_SCHEDULER=1` uruchamia job w procesie serwera.
- Po błędzie kolejna próba następuje z wykładniczym odstępem (15 min, 30 min, 1 h … aż do interwału providera). Klient HTTP ponawia błędy 5xx i timeouty, **nie** ponawia 401/403 i nie omija zabezpieczeń. Zapytania do jednego hosta idą po kolei, w odstępach co najmniej 1 s.
- Nowe dane zapisujemy dopiero po walidacji: poprawne daty, znane frakcje, brak kolizji kolumn, kompletność.
- Ta sama treść (hash) nie tworzy nowej wersji. Poprzednie wersje trafiają do `schedule_versions`, zmiany terminów do `changes`, a wszystko do `update_logs`.
- Powiadomienia o zmianach (outbox `notifications`) powstają wyłącznie z danych, które przeszły walidację.
- Monitorujemy też listy dokumentów na stronach gmin. Pojawienie się nowego lub usunięcie istniejącego PDF zapisuje się jako `SOURCE_CHANGED`.
- Przycisk „Odśwież” w aplikacji wywołuje ręczne sprawdzenie. Jest ograniczone do jednego zapytania na 2 minuty na adres i 6 na minutę na IP.

## Produkcja (Supabase)
1. Zastosuj migrację `supabase/migrations/20261126120000_trashly_init.sql` oraz `supabase/seed.sql`.
2. Na serwerze ustaw `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`. Klucz service role zostaje wyłącznie po stronie serwera, frontend go nie zna.
3. Zainstaluj `poppler-utils`, uruchom `npm start` i ustaw cron z `npm run update`.

RLS: dane publiczne (miasta, kategorie, przewodnik) są tylko do odczytu. Rekordy użytkownika są dostępne tylko dla właściciela. Harmonogramy, logi i dokumenty zapisuje wyłącznie backend.

`SupabaseStore` jest zaimplementowany zgodnie ze schematem, ale **nie był testowany na żywym projekcie Supabase**. Testy automatyczne korzystają z `FileStore`.

## Dodanie miasta
1. Wpis w `server/src/providers/cities.ts`: kod TERYT, źródła, możliwości.
2. Klasa implementująca `ScheduleProvider` (`server/src/providers/provider.ts`), zarejestrowana w `providers/index.ts`.
3. Testy na zapisanych, prawdziwych odpowiedziach źródła (`server/test/fixtures/`).

## Kolory pojemników
Kolory papieru (niebieski), szkła (zielony), metali i tworzyw (żółty) oraz bio (brązowy) wynikają z ogólnopolskiego rozporządzenia (Dz.U. 2017 poz. 19).
Dla odpadów zmieszanych przepisy nie narzucają koloru, dlatego aplikacja go nie podaje. Godzinę wystawienia pokazujemy tylko wtedy, gdy podaje ją oficjalne źródło (Rybnik, Jastrzębie: 6:00). W pozostałych przypadkach odsyłamy do regulaminu gminy.
