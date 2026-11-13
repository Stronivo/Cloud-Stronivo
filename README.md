# Stronivo — stronivo.com

Strona studia **Stronivo** — „Podłączamy Twoją firmę do internetu.”

React 19 + TypeScript + Tailwind CSS 4, budowane przez Vite. Bez bibliotek animacji i 3D — cały motyw kabla to ręcznie cieniowane SVG sterowane `requestAnimationFrame`.

## Uruchomienie

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # produkcja → dist/
npm run preview
```

## Asystent AI Stroniq

Widget czatu w prawym dolnym rogu (`src/chat/`) z backendem w `api/chat.ts` i `api/lead.ts` (Claude przez `@anthropic-ai/sdk`). **Wymaga `ANTHROPIC_API_KEY` w Vercel.** Bez klucza widget pokazuje, że asystent jest niedostępny, i kieruje do formularza. Konfiguracja, baza wiedzy, koszty, RODO i testy: **`STRONIQ.md`**.

## SEO i prerendering

Animacja kabla w hero (`src/intro/heroIntro.ts`) jest samodzielną funkcją bez importów: prerender wstawia ją bezpośrednio do HTML strony głównej, więc rusza bez czekania na bundle Reacta. Przy jej edycji nie wolno odwoływać się do niczego spoza funkcji.

`npm run build` buduje aplikację, a następnie `scripts/prerender.mjs` zapisuje gotowy HTML każdej podstrony (`index.html`, `polityka-prywatnosci.html`, `informacje-prawne.html`, `404.html`). Metadane, canonical i dane strukturalne są w `src/seo.ts`. Domena kanoniczna to **https://www.stronivo.com** (wersja bez www przekierowuje). Raport zmian: `SEO-RAPORT.md`.

Obrazy portfolio: `public/work/<nazwa>-desktop-{900,1600}` i `-mobile-{200,400,600}` w formatach `.avif` i `.webp`. Są cache'owane przez rok, więc nowy obraz musi mieć nową nazwę.

## Struktura

```
src/
  components/cable/   Wspólny język wizualny: wtyczka, port, przewód (parts.tsx) + silnik animacji hero (HeroCable.tsx)
  components/         Navbar, Logo, Cursor, Magnetic (przyciski), Reveal (animacje tekstu), ContactForm
  sections/           Hero, Work, Services, Connect, Process, About, Marquee, Contact, Footer
  pages/LegalPage.tsx Strony prawne (szkielety — patrz niżej)
  data/site.ts        Wszystkie treści, linki i projekty w jednym miejscu
  hooks/              useInView, useScrollProgress, useMedia (reduced motion, fine pointer)
api/contact.ts        Funkcja Vercel wysyłająca formularz przez Resend
public/work/          Zrzuty ekranu projektów demonstracyjnych (WebP)
```

## Formularz kontaktowy — Formspree

Formularz wysyła wiadomości do formularza Formspree **`https://formspree.io/f/mnpaarla`** (adres wpisany w `src/components/ContactForm.tsx`), który przekazuje je na `kontakt@stronivo.com`. Nie trzeba ustawiać żadnych zmiennych w Vercel.

W mailu pola mają polskie nazwy, „Odpowiedz” trafia do nadawcy, a pole-pułapka `_gotcha` odsiewa boty. Walidacja działa po stronie przeglądarki; Formspree dodatkowo filtruje spam.

Inny formularz Formspree można podać w zmiennej `VITE_CONTACT_ENDPOINT` (wymaga Redeploy). Alternatywnie ustaw ją na `/api/contact` i skonfiguruj funkcję `api/contact.ts` (Resend) zmiennymi `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.

Formularz wymaga potwierdzenia zapoznania się z polityką prywatności (podstawa przetwarzania wg polityki: art. 6 ust. 1 lit. f RODO).

## Do uzupełnienia przed publikacją

- [x] Polityka prywatności (`/polityka-prywatnosci`) — treść w `src/data/privacy.ts`, dane firmy w `COMPANY` w `src/data/site.ts`.
- [x] Informacje prawne (`/informacje-prawne`) i linki do profili społecznościowych.
- [x] Formularz kontaktowy podłączony do Formspree. Po wdrożeniu wyślij jedną wiadomość testową.
- [ ] **Projekty demonstracyjne** — gdy pojawią się realizacje dla klientów, dodaj je w `PROJECTS` (zrzuty do `public/work/`).

## Wdrożenie na Vercel

Zaimportuj repozytorium — `vercel.json` ustawia framework Vite, przepisywanie ścieżek dla stron prawnych, cache zasobów i nagłówki bezpieczeństwa. Funkcja z `api/` wdraża się automatycznie.

## Dostępność i wydajność

- Cel: WCAG 2.2 AA — semantyczne sekcje i nagłówki, skip-link, widoczny focus, menu mobilne z pułapką fokusa i obsługą Esc, komunikaty formularza w `aria-live`.
- `prefers-reduced-motion`: animacja hero od razu pokazuje stan „podłączony”, sekcje przewijane stają się statyczne, kursor i efekty magnetyczne są wyłączone.
- Pętle animacji działają tylko, gdy sekcja jest widoczna, a karta aktywna. Na telefonach hero używa uproszczonej wersji bez filtrów SVG.
- Fonty w `src/assets/fonts` (Inter i Space Grotesk, OFL): podzbiór latin plus Latin Extended-A (wszystkie polskie znaki). Obrazy AVIF/WebP z `srcset`, `loading="lazy"` i stałymi wymiarami (brak CLS).
- Szczegóły optymalizacji wydajności i wyniki pomiarów: `PERFORMANCE.md`.
