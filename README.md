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

## Formularz kontaktowy — wymagane przed publikacją

Formularz wysyła prawdziwe żądanie i **niczego nie symuluje**. Dopóki usługa nie jest skonfigurowana, użytkownik widzi komunikat „Formularz nie jest jeszcze aktywny” z adresem e-mail.

**Opcja A — wbudowana funkcja Vercel (`/api/contact`, Resend).** W Vercel → Settings → Environment Variables ustaw:

| Zmienna | Przykład |
| --- | --- |
| `RESEND_API_KEY` | klucz z resend.com |
| `CONTACT_TO_EMAIL` | `kontakt@stronivo.com` |
| `CONTACT_FROM_EMAIL` | `Stronivo <formularz@stronivo.com>` (domena zweryfikowana w Resend) |

**Opcja B — zewnętrzna usługa** (Formspree, Web3Forms…): ustaw `VITE_CONTACT_ENDPOINT` na adres endpointu przyjmującego JSON.

Formularz ma walidację po stronie klienta i serwera, pole-pułapkę na boty (honeypot) oraz wymaganą zgodę na przetwarzanie danych.

## Do uzupełnienia przed publikacją

- [ ] **Polityka prywatności** (`/polityka-prywatnosci`) i **Informacje prawne** (`/informacje-prawne`) — obecnie to jawnie oznaczone szkielety z listą brakujących elementów, z `noindex`. Treść musi przygotować / zweryfikować osoba odpowiedzialna.
- [ ] **Adresy profili** Instagram / TikTok / Facebook w `src/data/site.ts` — wpisane jako `…/stronivo`, sprawdź, czy są poprawne.
- [ ] **Projekty demonstracyjne** — Easy Busy i Bella Italia są oznaczone jako „Projekt demonstracyjny”. Gdy pojawią się realizacje dla klientów, dodaj je w `PROJECTS` (zrzuty do `public/work/`).
- [ ] Konfiguracja formularza (sekcja wyżej).

## Wdrożenie na Vercel

Zaimportuj repozytorium — `vercel.json` ustawia framework Vite, przepisywanie ścieżek dla stron prawnych, cache zasobów i nagłówki bezpieczeństwa. Funkcja z `api/` wdraża się automatycznie.

## Dostępność i wydajność

- Cel: WCAG 2.2 AA — semantyczne sekcje i nagłówki, skip-link, widoczny focus, menu mobilne z pułapką fokusa i obsługą Esc, komunikaty formularza w `aria-live`.
- `prefers-reduced-motion`: animacja hero od razu pokazuje stan „podłączony”, sekcje przewijane stają się statyczne, kursor i efekty magnetyczne są wyłączone.
- Pętle animacji działają tylko, gdy sekcja jest widoczna, a karta aktywna. Na telefonach hero używa uproszczonej wersji bez filtrów SVG.
- Fonty hostowane lokalnie (Fontsource, `unicode-range`), obrazy WebP z `srcset`, `loading="lazy"` i stałymi wymiarami (brak CLS).
