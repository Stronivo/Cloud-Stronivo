# Raport SEO — stronivo.com

**Data:** 13 listopada 2026
**Zakres:** optymalizacja SEO lokalnego i wydajności mobilnej bez zmiany designu, animacji i funkcjonalności.
**Frazy główne:** tworzenie stron internetowych Żory · strony internetowe dla firm · projektowanie stron internetowych Śląsk · strony internetowe dla restauracji

---

## 1. Podsumowanie

Najpoważniejszy problem nie dotyczył treści, tylko techniki. Cała strona powstawała w przeglądarce z JavaScriptu, więc serwer zwracał każdej podstronie **ten sam pusty HTML**: ten sam tytuł, opis i canonical wskazujący stronę główną. Dodatkowo wszystkie adresy w metadanych prowadziły do `stronivo.com`, które przekierowuje na `www.stronivo.com`.

Po zmianach każda podstrona jest generowana do statycznego HTML przy buildzie (prerendering). Ma własne metadane, poprawny canonical i pełną treść widoczną bez JavaScriptu. Design, animacje i formularz działają jak wcześniej, co sprawdziłem na zrzutach przed i po.

### Wyniki Lighthouse — telefon (3 przebiegi, ten sam serwer i warunki)

| | Przed | Po |
|---|---|---|
| Performance | 93–99 | **98** (stabilnie) |
| Accessibility | 96 | **100** |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| Speed Index | 3,0 s | **2,0–2,2 s** |
| Total Blocking Time | 30–50 ms | **10–30 ms** |
| CLS | 0 | 0 |
| Pobrane dane | 366 KiB | **294 KiB** (−20%) |
| Słowa treści w HTML bez JS | **0** | **~560** (strona główna) |

Lighthouse dawał SEO 100 także przed zmianami, bo sam renderuje JavaScript. Nie wykrywał jednak duplikacji metadanych między podstronami ani błędnego canonical. Te problemy znalazłem ręcznym audytem.

---

## 2. Wykryte problemy

### Krytyczne (naprawione)
| # | Problem | Skutek |
|---|---|---|
| K1 | Treść renderowana wyłącznie przez JavaScript: `<div id="root"></div>` był pusty | Indeksowanie zależało od renderowania JS przez Google (opóźnienia). Inne wyszukiwarki i podglądy linków widziały pustą stronę |
| K2 | Wszystkie podstrony zwracały identyczny HTML: ten sam `<title>`, `description` i canonical | Polityka prywatności i Informacje prawne miały **canonical wskazujący stronę główną**, więc Google mógł je pominąć jako duplikaty |
| K3 | Canonical, `og:url`, `sitemap.xml` i `robots.txt` używały `https://stronivo.com`, które przekierowuje (308) na `https://www.stronivo.com` | Canonical i sitemap prowadziły do adresów z przekierowaniem, co dawało sprzeczne sygnały dla Google |
| K4 | Nieistniejące adresy (np. `/cokolwiek`) zwracały status **200** ze stroną główną | „Soft 404”: śmieciowe adresy mogły trafiać do indeksu jako duplikaty strony głównej |

### Średnie (naprawione)
| # | Problem |
|---|---|
| S1 | Title i description nie zawierały frazy lokalnej ani grupy docelowej (restauracje, kawiarnie) |
| S2 | W treści nie było informacji o obsługiwanym regionie (Żory, Śląsk) ani o stronach dla restauracji |
| S3 | Tekst nagłówków sklejał się dla robotów: „Podłączamy**Twoją** firmę…”, „podłączyć**swój** biznes”, „§1.**Postanowienia**”. Na ekranie wyglądały dobrze, ale w kodzie brakowało spacji |
| S4 | Kontrast: przyciemnione słowa w sekcji „O nas” (animacja przy przewijaniu) miały kontrast poniżej WCAG AA |
| S5 | Nazwa dostępna linku na makietach portfolio nie zgadzała się z widoczną treścią (`label-content-name-mismatch`) |
| S6 | Obraz w makiecie telefonu miał 600 px szerokości, a wyświetlał się w ~80 px. Brak formatu AVIF |
| S7 | Obrazy portfolio były cache'owane tylko przez 30 dni |
| S8 | Link „stronivo.com” w kontakcie prowadził przez przekierowanie |
| S9 | Dane strukturalne: tylko podstawowa `Organization`, bez obszaru działania, usług i profili społecznościowych |

### Niskie / informacyjne (bez zmian, do rozważenia)
| # | Uwaga |
|---|---|
| N1 | DOM strony głównej ma ~1040 elementów (próg Lighthouse to 800). Wynika to z animowanych grafik SVG i dzielenia nagłówków na słowa. Zmniejszenie wymagałoby zmian w animacjach, więc zostawiłem bez zmian |
| N2 | ~31 KiB nieużywanego JS przy pierwszym wejściu (głównie React). Podział kodu niewiele by dał przy jednej długiej stronie |
| N3 | Sprawdziłem, że wstawienie CSS bezpośrednio do HTML nie poprawia wyników, więc CSS zostaje osobnym plikiem, który się cache'uje |

---

## 3. Wykonane zmiany

### Indeksowalność i adresy
- **Prerendering przy buildzie** (`scripts/prerender.mjs`, `src/entry-server.tsx`): `npm run build` generuje `index.html`, `polityka-prywatnosci.html`, `informacje-prawne.html` i `404.html` z pełną treścią. React „ożywia” gotowy HTML (hydratacja) bez przebudowy strony. Sprawdziłem, że nie ma błędów hydratacji na żadnej podstronie. Nie doszły żadne nowe zależności.
- **Prawdziwe 404:** `vercel.json` ma `cleanUrls` zamiast przepisywania wszystkiego na stronę główną. Nieznane adresy dostają status 404 i stronę z `noindex, follow`.
- **Domena www:** wszystkie adresy absolutne (canonical, Open Graph, sitemap, robots, JSON-LD, link w kontakcie) wskazują `https://www.stronivo.com`.
- **Zabezpieczenie bez JS:** jeśli JavaScript się nie wczyta albo wczyta z dużym opóźnieniem, treść hero i tak pokazuje się po ~3,5 s. Przy normalnym działaniu nic się nie zmienia. Dodałem też `<noscript>` ze stylami, które od razu odsłaniają treść.

### Metadane (`src/seo.ts`, jedno źródło prawdy)
| Podstrona | Title | Description | Canonical | Robots |
|---|---|---|---|---|
| `/` | Tworzenie Stron Internetowych Żory \| Stronivo | Projektujemy nowoczesne strony internetowe dla małych firm, restauracji i kawiarni. Stronivo – strony dopasowane do Twojego biznesu. Poznaj ofertę! (147 zn.) | `https://www.stronivo.com/` | index |
| `/polityka-prywatnosci` | Polityka prywatności \| Stronivo | unikalny, 157 zn. | `…/polityka-prywatnosci` | index |
| `/informacje-prawne` | Informacje prawne \| Stronivo | unikalny, 146 zn. | `…/informacje-prawne` | index |
| 404 | Nie znaleziono strony \| Stronivo | — | brak | noindex, follow |

Każda podstrona ma własne `og:title`, `og:description` i `og:url`. Nie używam `meta keywords`.

### Dane strukturalne (JSON-LD)
- Strona główna: `Organization` (Stronivo) z `areaServed`: Żory i województwo śląskie, katalogiem 4 usług, `sameAs` do Instagrama, TikToka i Facebooka oraz `parentOrganization` z prawdziwymi danymi EASY BUSY Sp. z o.o. (NIP, adres). Do tego `WebSite` i `WebPage`.
- Podstrony prawne: `WebPage` (polityka z `dateModified`).
- Nie dodałem `LocalBusiness` z adresem w Żorach, bo firma nie podała takiego adresu (szczegóły w punkcie 5).

### Treść (motto zostało bez zmian)
- **Hero:** H1 „Podłączamy Twoją firmę do internetu.” bez zmian. Mały napis nad nim zmieniłem z „Studio projektowania stron internetowych” na **„Tworzenie stron internetowych · Żory i Śląsk”**.
- **Usługi:** nowy akapit pod nagłówkiem opisuje strony dla firm, **strony internetowe dla restauracji** i kawiarni oraz landing page. Fraza o restauracjach jest linkiem do portfolio z przykładem restauracji.
- **O nas:** nowy blok z nagłówkiem H3 **„Projektowanie stron internetowych — Żory i Śląsk”** i dwoma akapitami o obsłudze firm z regionu, z linkiem do formularza kontaktowego.
- Każda fraza docelowa pojawia się w treści 1–2 razy, w naturalnym kontekście.

### Struktura nagłówków (strona główna)
```
H1 Podłączamy Twoją firmę do internetu.
  H2 Nie tylko projektujemy. Tworzymy wrażenie.     H3 Easy Busy · H3 Bella Italia
  H2 Wszystko, czego potrzebuje Twoja firma w sieci. H3 × 4 usługi
  H2 Twój biznes. Świat online. Jeden przewód.
  H2 Od pierwszej rozmowy do ostatniego kliknięcia.  H3 × 4 etapy
  H2 Małe studio. Wielkie pomysły.                   H3 Projektowanie stron internetowych — Żory i Śląsk
  H2 Gotowy podłączyć swój biznes?                   H3 Formularz kontaktowy
```
Na każdej podstronie jest jeden H1, a poziomy nagłówków nie są pomijane.

### Obrazy i wydajność mobilna
- **AVIF + WebP** przez `<picture>` dla wszystkich zrzutów portfolio. AVIF jest o 25–35% lżejszy.
- Nowe warianty makiety telefonu (200 i 400 px) i poprawione `sizes`, więc telefon pobiera obraz 200 px zamiast 600 px.
- **Alty** opisują, co jest na obrazie, np. „Projekt demonstracyjny strony internetowej restauracji Bella Italia — widok na telefonie”.
- Cache obrazów `/work/` wydłużony do 1 roku. Przy podmianie obrazu trzeba zmienić nazwę pliku.
- Preload fontu nagłówka (Space Grotesk, latin i latin-ext dla polskich znaków).
- **Intro hero na telefonie** ma tę samą choreografię, ale jest krótsze (~1,1 s zamiast ~1,7 s), więc nagłówek pojawia się szybciej. Na komputerze bez zmian.

### Dostępność (WCAG 2.2 AA)
- Przyciemnione słowa w animacji „O nas” mają teraz kontrast zgodny z AA (krycie 0,5 zamiast 0,22). Efekt przewijania został.
- Napisy w obrysie w dekoracyjnym pasku są teraz w pseudo-elemencie CSS. Wyglądają identycznie i nie są traktowane jako treść.
- Linki makiet portfolio mają nazwę zgodną z widoczną treścią.

### robots.txt i sitemap.xml
- `robots.txt`: `Allow: /`, `Disallow: /api/`, adres sitemap na www.
- `sitemap.xml`: 3 indeksowalne adresy na www z `lastmod`. Strona 404 nie jest w sitemap.

### Linkowanie wewnętrzne
Nawigacja i stopka linkują do wszystkich sekcji i podstron. W nowych treściach są 2 dodatkowe linki kontekstowe (do portfolio i kontaktu). Podstrony prawne linkują do siebie nawzajem i do strony głównej.

---

## 4. Zmienione pliki
`index.html`, `package.json` (skrypt build), `vercel.json`, `public/robots.txt`, `public/sitemap.xml`, `public/work/*` (nowe AVIF/WebP), `scripts/prerender.mjs` (nowy), `src/seo.ts` (nowy), `src/entry-server.tsx` (nowy), `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/data/site.ts`, `src/components/cable/HeroCable.tsx`, `src/sections/{Hero,Work,Services,About,Contact,Marquee,Footer}.tsx`, `src/pages/LegalPage.tsx`.

---

## 5. Do zrobienia poza kodem (ważne dla SEO lokalnego)

1. **Google Search Console:** dodaj właściwość `https://www.stronivo.com` (lub domenową `stronivo.com`), prześlij `sitemap.xml` i zleć ponowne zindeksowanie strony głównej i obu podstron prawnych.
2. **Profil Firmy w Google (Google Business Profile)** ma największy wpływ na wyniki lokalne („w pobliżu”, mapa). Załóż profil jako **firma z obszarem obsługi** (Żory, okoliczne miasta, województwo śląskie), bez pokazywania adresu. **Uwaga:** adres rejestrowy (Kiełczów) leży w województwie dolnośląskim. Nie wpisuj adresu w Żorach, jeśli firma faktycznie tam nie działa, bo Google może zawiesić profil.
3. **Spójność danych:** nazwa, e-mail i strona powinny być identyczne na stronie, w profilu Google i w mediach społecznościowych. W bio na Instagramie, TikToku i Facebooku podaj link `https://www.stronivo.com`.
4. **Zweryfikuj opis lokalizacji:** treść mówi, że Stronivo tworzy strony „dla firm z Żor i całego Śląska”. Jeśli zasięg jest inny, popraw tekst w `src/sections/About.tsx` i `src/seo.ts`.
5. **Prawdziwe realizacje i opinie:** pierwsze strony zrobione dla klientów (z ich zgodą) i prawdziwe opinie w profilu Google wzmocnią pozycję lokalną. Na stronie nie ma i nie powinno być fikcyjnych opinii.
6. **Opcjonalnie, w przyszłości:** osobne podstrony, np. „Strony internetowe dla restauracji”, pomogłyby w tej frazie. Zgodnie z wytycznymi nie tworzyłem ich automatycznie.
7. **Bing Webmaster Tools:** można zaimportować ustawienia z Search Console.

---

## 6. Jak sprawdzić po wdrożeniu
- `curl -s https://www.stronivo.com/polityka-prywatnosci | grep -E "<title>|canonical"` powinien pokazać unikalny tytuł i własny canonical.
- `https://www.stronivo.com/nieistniejaca-strona` powinien zwrócić status **404**.
- Test wyników z elementami rozszerzonymi (search.google.com/test/rich-results) dla strony głównej: Organization bez błędów.
- Search Console → Sprawdzanie adresu URL → „Wyświetl przetestowaną stronę”: treść widoczna w HTML.
