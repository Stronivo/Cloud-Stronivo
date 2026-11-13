# Optymalizacja wydajności mobilnej — stronivo.com

**Data:** 13 listopada 2026
**Zakres:** wydajność mobilna bez zmian w wyglądzie, układzie, animacjach, efektach 3D, interakcjach i funkcjach.

## Metodologia

- **Lighthouse 12, profil mobile** (symulowane wolne 4G, 4× wolniejszy CPU). Obie wersje — bazowa (commit `99ae2a4`) i nowa — zbudowane identycznie i serwowane z tego samego lokalnego serwera z kompresją Brotli. **Mediana z 5 przebiegów** dla każdej wersji.
- Liczby nie są wprost porównywalne z PageSpeed Insights: inny sprzęt, inna sieć, inne położenie serwera. U Ciebie PSI pokazywał SI 5,2 s. Lokalnie wersja bazowa miała SI 2,09 s, a wdrożona `www.stronivo.com` 2,7–3,0 s. Liczy się **różnica przed/po w tych samych warunkach**.
- Dodatkowo: ślad Chrome DevTools (wymuszone layouty, długie zadania), pomiar realnego momentu pojawienia się treści w przeglądarce, zrzuty porównawcze piksel po pikselu, testy funkcjonalne i audyt SEO.

## Wyniki (mediana z 5 przebiegów, Lighthouse mobile)

| Metryka | Przed | Po | Zmiana |
|---|---|---|---|
| **FCP** | 1,66 s | **1,36 s** | −0,30 s (−18%) |
| **Speed Index** | 2,09 s | **1,66 s** | −0,43 s (−21%) |
| **LCP** | 2,04 s | **2,06 s** | +0,02 s (w granicach szumu, patrz niżej) |
| **TBT** | 8 ms | **0 ms** | −8 ms |
| **CLS** | 0 | **0** | bez zmian |
| Performance | 98 | **99** | |
| Accessibility / Best Practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 | bez zmian |
| Pobrane dane | 294 KiB | **213 KiB** | −81 KiB (−28%) |
| Animacje niekomponowane (non-composited) | 17 | **0** | |
| Żądania na stronie głównej (telefon) | 10 | 9 | |
| Wymuszony layout przez JS (ładowanie + przewinięcie całej strony, 4× CPU) | 12–29 ms | 6–9 ms | |

**Rzeczywisty moment pojawienia się treści** (telefon, bez dławienia, mierzony w przeglądarce):

| | Przed | Po |
|---|---|---|
| Intro zakończone (wtyczka wpięta) | 1890 ms | **1400 ms** |
| Podtytuł hero widoczny w 90% | 2222 ms | **1734 ms** |

### Ważne: LCP

Wcześniej LCP wynosił ~2,0 s, ale był to **artefakt pomiaru**. Zabezpieczająca animacja CSS (dodana przy optymalizacji SEO) kolidowała z przejściami intro. Przez to Chrome nie rejestrował pojawiania się podtytułu i napisu nad nagłówkiem jako kandydatów LCP i „zatrzymywał” LCP na wcześnie namalowanym fragmencie nagłówka.

Po usunięciu kolizji Chrome rejestruje rzeczywiste pojawienie się podtytułu. Robi to **po zakończeniu przejścia opacity** (przejście trwa 1 s i jest częścią projektu animacji). Mimo to LCP utrzymuje się na poziomie ~2,06 s, a treść pojawia się realnie ~0,5 s wcześniej niż przed zmianami.

Na PageSpeed Insights LCP może więc wyglądać inaczej niż wcześniej, bo teraz mierzy faktyczny moment pojawienia się treści, a nie artefakt. Nie stosowałem trików w rodzaju startowania animacji od `opacity: 0.01`, które poprawiają liczbę, ale nie wrażenia użytkownika.

## Zidentyfikowane przyczyny (z pomiarów, nie z założeń)

1. **Treść hero czekała na cały bundle Reacta.** Animacja kabla startowała dopiero po pobraniu, wykonaniu i hydratacji 99 KB JS. Przez pierwsze ~1,8 s ekran był prawie pusty (filmstrip). Jedynym widocznym elementem był port SVG narysowany w lewym górnym rogu, zanim JS ustawił mu pozycję (on wyznaczał FCP).
2. **Fonty: 175 KB z 324 KB transferu.** Plik Inter latin-ext ważył 83 KB, choć strona używa tylko polskich znaków z tego zakresu. Fonty konkurowały o łącze z JS.
3. **17 animacji niekomponowanych:**
   - zabezpieczająca animacja `intro-fallback` kolidowała z przejściami `opacity`/`transform` nagłówka, podtytułu, przycisków i menu, więc Chrome animował je na głównym wątku;
   - w SVG portu animowały się `fill`, `stroke` i `stroke-dashoffset` (dioda, kropki statusu, obwódka, linia „danych”).
4. **Render-blocking CSS** (~13 KB) w łańcuchu HTML → CSS → fonty.
5. **Wymuszony layout przy przewijaniu:**
   - trzy efekty zależne od scrolla miały osobne pętle `requestAnimationFrame` (odczyt → zapis → odczyt);
   - oś „Proces” odczytywała `offsetTop` w pętli zaraz po zapisach;
   - silnik hero odczytywał layout tuż po zapisach Reacta.
6. **Jedno długie zadanie hydratacji** całej strony naraz.
7. **Nieużywany JS:** kod podstron prawnych i kursora (tylko desktop) był w bundlu strony głównej na telefonie.

## Wykonane zmiany

| # | Zmiana | Pliki | Uzasadnienie i efekt |
|---|---|---|---|
| 1 | Silnik animacji kabla wydzielony do samodzielnej funkcji, **wstawianej bezpośrednio do HTML** przez prerender (5 KB po minifikacji). Startuje po pierwszej klatce (`rAF → setTimeout`), bez czekania na React | `src/intro/heroIntro.ts`, `scripts/prerender.mjs`, `HeroCable.tsx`, `Hero.tsx` | Intro rusza ~0,5 s wcześniej. Kod ruchu, czasy (`TIMING`, `TIMING_MOBILE`) i krzywe przeniesione 1:1. `HeroCable` to czysty znacznik SVG bez stanu, więc React go nie przerenderowuje |
| 2 | SVG kabla ukryte (`visibility`), dopóki silnik go nie ustawi | `index.css` | Usuwa klatkę z portem w lewym górnym rogu |
| 3 | Grubości przewodu i filtry SVG ustawia silnik od pierwszej klatki (wcześniej React poprawiał je po hydratacji) | `heroIntro.ts` | Brak przeskoku grubości kabla na telefonie. Filtry rozmycia tylko na desktopie, jak wcześniej |
| 4 | Fonty: własne `@font-face` z podzbiorem **Latin Extended-A** (wszystkie polskie znaki) zamiast pełnego latin-ext. Inter 85 → 14,5 KB, Space Grotesk 19 → 9 KB. Usunięte pakiety `@fontsource-variable/*` | `src/assets/fonts/*`, `index.css`, `main.tsx`, `package.json` | −105 KB fontów. Oś wagi (variable) zachowana. Preload tylko dla fontu nagłówka (Space Grotesk), potrzebnego do pierwszego widoku |
| 5 | CSS (11 KB Brotli) wstawiony w HTML | `scripts/prerender.mjs` | Znika render-blocking request. Zmierzone: FCP 1,52 → 1,36 s, LCP 2,30 → 2,06 s, SI 1,74 → 1,63 s |
| 6 | Usunięta kolizyjna animacja `intro-fallback`. Rolę zabezpieczenia przejął 4-sekundowy timer w skrypcie inline | `index.css`, `prerender.mjs` | Przejścia intro (opacity/transform) znów działają na GPU |
| 7 | Animacje `fill`/`stroke` portu i wtyczki zastąpione nakładką z animowanym `opacity` (ten sam kolor końcowy, te same czasy i opóźnienia) | `parts.tsx` | Komponowane na GPU |
| 8 | Na telefonie linia „danych” i jej odsłanianie animowane przez `transform` (`translateX`, `scaleX`) zamiast `stroke-dashoffset`. Ta sama prędkość (40 px/s). Desktop bez zmian | `index.css` | Na telefonie linia jest prosta, więc efekt jest identyczny. Non-composited: 17 → 0 |
| 9 | Wspólny harmonogram przewijania: jedna klatka rAF, najpierw wszystkie odczyty, potem wszystkie zapisy. „Proces” zapamiętuje geometrię w `ResizeObserver` | `useScrollProgress.ts`, `Process.tsx` | Wymuszony layout 12–29 → 6–9 ms |
| 10 | Podział kodu: podstrony prawne i kursor (tylko mysz) w osobnych chunkach | `src/lazy.ts`, `pages/legalPaths.ts`, `App.tsx` | Telefon na stronie głównej pobiera 1 plik JS |
| 11 | Granice `Suspense` wokół sekcji (bez leniwego ładowania): React hydratuje najpierw hero i nawigację, potem każdą sekcję w osobnym, krótszym zadaniu | `App.tsx` | TBT 8 → 0 ms |
| 12 | Prerender przez `react-dom/static` z `progressiveChunkSize: Infinity` | `entry-server.tsx` | Pełna treść w statycznym HTML (bez tego React wydzielał sekcje do ukrytych fragmentów, niewidocznych bez JS) |

### Sprawdzone i odrzucone (pogarszały wynik)

| Próba | Wynik | Decyzja |
|---|---|---|
| Leniwe ładowanie sekcji strony głównej (`React.lazy`) | Obserwowany LCP bez zmian, ale symulowany LCP **+0,28 s** (10 dodatkowych żądań przed LCP w modelu sieci Lighthouse) | Cofnięte. Sekcje w głównym bundlu, z granicami Suspense dla hydratacji |
| Odroczenie pobierania chunków do końca intro | LCP 2,76 s, SI 1,90 s | Cofnięte |
| `content-visibility: auto` dla sekcji poniżej pierwszego ekranu | SI 1,63 → 1,80 s, brak zysku | Cofnięte |

## Weryfikacja

- **Build:** `tsc` bez błędów, lint bez nowych ostrzeżeń, prerender 4 podstron.
- **Konsola:** 0 błędów i 0 ostrzeżeń hydratacji na wszystkich podstronach (telefon i desktop). Jedyny wpis to oczekiwany status 404 na stronie 404.
- **Regresja wizualna** (pełne strony, animacje wyłączone przez `prefers-reduced-motion`, piksel po pikselu):
  - desktop: strona główna i polityka prywatności identyczne;
  - telefon: 32 piksele różnicy (0,0007%) w dwóch miejscach: wygładzenie końca linii za portem i stan paska postępu w sekcji „Proces” w chwili zrzutu.
- **Animacja:** porównanie klatek ładowania (filmstrip) pokazuje tę samą sekwencję. Wtyczka podjeżdża, wpina się, port się zapala, przechodzi impuls, pojawia się nagłówek. Zmienił się tylko moment startu (wcześniej).
- **Funkcje** (telefon i desktop):
  - odsłanianie sekcji, kabel w sekcji „Połącz się” łączy się przy przewijaniu;
  - oś procesu, rozjaśnianie słów w „O nas”;
  - walidacja formularza (4 komunikaty), menu mobilne na pełnej wysokości;
  - kursor tylko na desktopie.
- **SEO:** title, description, canonical (`www`), Open Graph, JSON-LD, status 404, `robots.txt` i `sitemap.xml` bez zmian. Pełna treść w HTML bez JS (strona główna 561 słów).

## Uwagi i zalecenia

- **Testuj `https://www.stronivo.com`, nie `stronivo.com`.** Adres bez www przekierowuje (308), co dodaje opóźnienie dokumentu („Document request latency”) do każdego pomiaru PSI.
- **Cache:** pliki `/assets/*` (JS, CSS, fonty) mają nazwy z hashem i `max-age=1 rok, immutable`. Obrazy `/work/*` są cache'owane na 1 rok. HTML jest zawsze świeży (`must-revalidate`). Kompresję Brotli zapewnia Vercel.
- **Obrazy:** LCP to tekst, nie obraz, więc nie ma preloadu obrazu. Obrazy portfolio są w AVIF/WebP z `srcset`, leniwie ładowane i z wymiarami (z poprzedniej optymalizacji).
- **Speed Index na PSI:** na stronie są stale działające animacje (kołysanie kabla, impulsy, migająca kropka, linia danych). Speed Index porównuje kolejne klatki z ostatnią, więc każda ruchoma animacja trochę go podnosi. Nie da się tego wyeliminować bez zmiany animacji.
- Nowe fonty mają tylko Latin + Latin Extended-A. Znaki spoza tego zakresu (np. wpisane w formularzu cyrylicą) wyświetlą się fontem systemowym.
