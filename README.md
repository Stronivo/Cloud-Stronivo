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

Formularz wysyła prawdziwe żądanie i **niczego nie symuluje**. Dopóki usługa nie jest skonfigurowana, użytkownik widzi komunikat „Formularz nie jest jeszcze aktywny” z adresem e-mail.

1. Załóż konto na formspree.io i utwórz formularz (**+ New Form**), wpisując `kontakt@stronivo.com` jako adres docelowy. Potwierdź ten adres mailem od Formspree.
2. Skopiuj adres formularza (np. `https://formspree.io/f/abcd1234`).
3. Vercel → Settings → Environment Variables: `VITE_CONTACT_ENDPOINT` = ten adres.
4. Deployments → **Redeploy** (zmienna jest wbudowywana podczas budowania).

W mailu pola mają polskie nazwy, „Odpowiedz” trafia do nadawcy, a pole-pułapka `_gotcha` odsiewa boty. Walidacja działa po stronie przeglądarki; Formspree dodatkowo filtruje spam.

Alternatywa: zostaw `VITE_CONTACT_ENDPOINT` puste i skonfiguruj funkcję `api/contact.ts` (Resend) zmiennymi `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.

Formularz wymaga potwierdzenia zapoznania się z polityką prywatności (podstawa przetwarzania wg polityki: art. 6 ust. 1 lit. f RODO).

## Do uzupełnienia przed publikacją

- [x] Polityka prywatności (`/polityka-prywatnosci`) — treść w `src/data/privacy.ts`, dane firmy w `COMPANY` w `src/data/site.ts`.
- [x] Informacje prawne (`/informacje-prawne`) i linki do profili społecznościowych.
- [ ] Formspree: utworzyć formularz i ustawić `VITE_CONTACT_ENDPOINT` w Vercel (sekcja wyżej).
- [ ] **Projekty demonstracyjne** — gdy pojawią się realizacje dla klientów, dodaj je w `PROJECTS` (zrzuty do `public/work/`).

## Wdrożenie na Vercel

Zaimportuj repozytorium — `vercel.json` ustawia framework Vite, przepisywanie ścieżek dla stron prawnych, cache zasobów i nagłówki bezpieczeństwa. Funkcja z `api/` wdraża się automatycznie.

## Dostępność i wydajność

- Cel: WCAG 2.2 AA — semantyczne sekcje i nagłówki, skip-link, widoczny focus, menu mobilne z pułapką fokusa i obsługą Esc, komunikaty formularza w `aria-live`.
- `prefers-reduced-motion`: animacja hero od razu pokazuje stan „podłączony”, sekcje przewijane stają się statyczne, kursor i efekty magnetyczne są wyłączone.
- Pętle animacji działają tylko, gdy sekcja jest widoczna, a karta aktywna. Na telefonach hero używa uproszczonej wersji bez filtrów SVG.
- Fonty hostowane lokalnie (Fontsource, `unicode-range`), obrazy WebP z `srcset`, `loading="lazy"` i stałymi wymiarami (brak CLS).
