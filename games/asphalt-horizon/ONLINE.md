# Asphalt Horizon: włączenie kont i gry online

Gra działa od razu w trybie gościa (offline). Logowanie (Google, e-mail i hasło), zapis postępu na koncie oraz party ze znajomymi włączają się po podłączeniu projektu Supabase.

## 1. Projekt Supabase

1. Utwórz nowy projekt (np. `AsphaltHorizon`, region `eu-central-1`). Najlepiej osobny, żeby gracze nie mieszali się z użytkownikami innych aplikacji.
2. **SQL Editor** → wklej i uruchom `supabase/migrations/20261125_asphalt_horizon.sql`. Skrypt można bezpiecznie uruchomić ponownie.
3. **Project Settings → API**: skopiuj `Project URL` i klucz **publishable/anon** do `config.js`.
   Nigdy nie wklejaj klucza `service_role` / `secret` do plików gry.

## 2. Logowanie

**Authentication → Sign In / Providers**
- **Email**: włącz, zostaw „Confirm email” włączone.
- **Google**: wpisz Client ID i Client Secret z Google Cloud Console (OAuth client typu „Web application”).
  W Google Cloud jako *Authorized redirect URI* podaj `https://<twój-projekt>.supabase.co/auth/v1/callback`.

**Authentication → URL Configuration**
- *Site URL* i *Redirect URLs*: adres, pod którym hostujesz grę (np. `https://twojadomena.pl/asphalt-horizon/`).

**Authentication → Policies / Passwords** (zalecane)
- Minimalna długość hasła: 8. Wymagaj liter i cyfr.
- Włącz *Leaked password protection*. Zostaw domyślne limity prób logowania (rate limits).

## 3. Realtime (party)

**Realtime → Settings**: wyłącz *Allow public access*. Wtedy działają tylko kanały prywatne, a polityki z migracji wpuszczają na kanał `party:<KOD>` wyłącznie członków danego party.

## 4. Hosting

Strona-artefakt na claude.ai blokuje połączenia sieciowe, więc tam gra działa tylko w trybie gościa. Wersję online wrzuć na zwykły hosting statyczny, np. Vercel, Netlify albo własny serwer. Wystarczy folder `games/asphalt-horizon/`, bez budowania.

## Co chroni bazę danych

- **RLS na każdej tabeli.** Gracz widzi tylko własny profil i party, do których należy.
- **Brak zapisu wprost do tabel.** Role `anon` i `authenticated` nie mają INSERT/UPDATE/DELETE. Każda zmiana przechodzi przez funkcje `SECURITY DEFINER` z pustym `search_path`.
- **Ceny i nagrody liczy serwer** z własnych tabel (`ah_cars`, `ah_upgrades`, `ah_boosts`, `ah_cities`). Klient nie może sam ustawić punktów ani XP.
- **Walidacja wyników.** Miejsce 1–6, limity monet, takedownów i czasu, nie częściej niż co 40 s. Zebrane boosty mają limit na wyścig.
- **Kod party.** 6 znaków z 32 (ok. 1 mld kombinacji), losowany kryptograficznie (`gen_random_bytes`). Wygasa po 6 godzinach. Maksymalnie 15 prób dołączenia na 10 minut na konto, maksymalnie 6 graczy.
- **Wygląd auta.** Pola kosmetyki są na białej liście (kolor, lakier, felgi, neon), a reszta jest odrzucana.
- **Nick** jest czyszczony z HTML i znaków specjalnych.
- Migrację przetestowano na Postgres 16 z atakami: zapis do cudzych danych, kupno zablokowanych aut, zawyżony wynik, brute-force kodu, wysyłanie na cudzy kanał. Wszystkie zostały odrzucone.

Ograniczenie: pozycje aut w wyścigu online wysyłają przeglądarki graczy, więc ktoś bardzo zdeterminowany może oszukać na pozycji w wyścigu ze znajomymi. Nagrody i tak mają limity po stronie serwera.
