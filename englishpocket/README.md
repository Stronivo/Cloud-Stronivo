# EnglishPocket

„Angielski bez kursu. Bez presji. Bez limitów.”

Sklep z materiałami PDF do samodzielnej nauki angielskiego. React 19 + TypeScript + Tailwind CSS 4 + GSAP/ScrollTrigger, backend jako funkcje Vercel (`api/`): Stripe Checkout, Supabase (baza + prywatny Storage), Resend (e-maile).

Domyślny język: polski. Przełącznik PL/EN w nawigacji (slogan zawsze zostaje po polsku). W sekcji demo działa kieszonkowy tłumacz polsko-angielski (lokalny słowniczek, `src/data/vocab.ts`).

## Uruchomienie

```bash
cd englishpocket
npm install
npm run dev          # frontend; funkcje /api uruchamia `vercel dev`
npm run build
npm run typecheck:api
```

## Konfiguracja sklepu (przed startem sprzedaży)

1. **Supabase** → SQL Editor → uruchom `supabase/schema.sql`. Utwórz **prywatny** bucket `materials` i wgraj do niego PDF-y.
2. W tabeli `products` dodaj 5 produktów. `slug` musi pasować do `src/data/products.ts`:
   `e8-exam`, `grammar-mastery`, `professional-english`, `everyday-communication`, `vocabulary-expansion`.
   Wpisz prawdziwe `price_amount` (w groszach), `file_path`, opcjonalnie `details`, `level`, `page_count`, `preview_images`.
   Strona **niczego nie zgaduje** — bez bazy pokazuje „Cena wkrótce” i blokuje zakup.
3. **Stripe** → Developers → Webhooks → endpoint `https://TWOJA_DOMENA/api/stripe-webhook`, zdarzenia:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
4. **Resend** → zweryfikuj domenę nadawcy.
5. Uzupełnij zmienne z `.env.example` w Vercel (Root Directory projektu: `englishpocket`).
6. Uzupełnij dane sprzedawcy (`VITE_COMPANY_*`) i **daj regulamin oraz politykę prywatności do weryfikacji prawnikowi** (`src/data/legal.ts`). Dopóki brak danych firmy, strony prawne pokazują baner „Dokument w przygotowaniu”.

## Jak działa płatność i pobieranie

- `POST /api/checkout` — ceny pobierane z bazy po stronie serwera; wymagana zgoda na dostarczenie treści cyfrowej (art. 38 ust. 1 pkt 13 u.p.k.).
- `POST /api/stripe-webhook` — weryfikacja podpisu, oznaczenie zamówienia jako opłacone (warunkowy UPDATE → e-mail wysyłany dokładnie raz), wygenerowanie tokenów pobierania.
- `GET /api/order?session_id=` — strona `/zamowienie` pyta Stripe o faktyczny status; linki pokazuje tylko dla opłaconego zamówienia.
- `GET /api/download?token=` — w bazie przechowywany jest tylko SHA-256 tokenu; ważność i limit pobrań sprawdzane atomowo, potem przekierowanie na 60-sekundowy podpisany URL z prywatnego bucketu.

## Struktura

```
api/                 checkout, stripe-webhook, order, download, products, contact (+ _lib)
supabase/schema.sql  tabele, RLS, funkcja consume_download
src/sections/        Hero, Story (scroll), Collection, HowItWorks, Why, About, Demo (+ tłumacz), Final, Footer
src/components/      Book (książka 3D w CSS), WordCard, Navbar, CartDrawer, ProductDialog, Magnetic, Tidy
src/i18n/dict.ts     wszystkie teksty PL/EN
```

3D zrealizowane w CSS (`preserve-3d`) zamiast WebGL — ostrzejsze, lżejsze i bez osobnego renderera na telefonach. `prefers-reduced-motion` wyłącza animacje i przypinanie sekcji.
