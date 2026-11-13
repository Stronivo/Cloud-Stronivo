-- EnglishPocket — schemat bazy Supabase
-- Uruchom w Supabase → SQL Editor. Skrypt jest idempotentny.
--
-- Pliki PDF trzymaj w PRYWATNYM buckecie `materials` (Storage → New bucket → bez "Public").
-- Podglądy stron (obrazy) możesz trzymać w PUBLICZNYM buckecie `previews`.
-- Ceny, opisy i liczby stron wpisujesz w tabeli `products` — strona niczego nie zgaduje.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,              -- np. 'e8-exam' — musi pasować do src/data/products.ts
  name            text not null,
  description     text,
  details         text[] not null default '{}',      -- punkty „Co zawiera pakiet” — tylko prawdziwe informacje
  level           text,                              -- np. 'A2–B1' (opcjonalnie)
  page_count      integer,                           -- opcjonalnie; puste = nie wyświetlamy
  price_amount    integer not null check (price_amount >= 200),  -- w groszach, np. 4900 = 49,00 zł
  currency        text not null default 'pln',
  file_path       text,                              -- ścieżka w buckecie `materials`, np. 'e8/e8-exam.pdf'
  preview_images  text[] not null default '{}',      -- pełne URL-e obrazów podglądu (publiczne)
  active          boolean not null default true,
  sort            integer not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  stripe_session_id  text not null unique,
  email              text,
  status             text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  amount_total       integer,
  currency           text,
  product_ids        uuid[] not null,
  consent_digital    boolean not null default false,  -- zgoda na dostarczenie treści cyfrowej przed upływem terminu odstąpienia
  created_at         timestamptz not null default now(),
  paid_at            timestamptz,
  email_sent_at      timestamptz
);

create table if not exists public.download_tokens (
  id             uuid primary key default gen_random_uuid(),
  token_hash     text not null unique,               -- SHA-256 tokenu; sam token zna tylko kupujący
  order_id       uuid not null references public.orders(id) on delete cascade,
  product_id     uuid not null references public.products(id),
  expires_at     timestamptz not null,
  max_downloads  integer not null default 5,
  download_count integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists download_tokens_order_idx on public.download_tokens(order_id);

-- Atomowe zużycie jednego pobrania: zwraca wiersz tylko, gdy token jest ważny.
create or replace function public.consume_download(p_token_hash text)
returns table (file_path text, product_name text)
language sql
security definer
set search_path = public
as $$
  update public.download_tokens t
     set download_count = t.download_count + 1
    from public.products p
   where t.token_hash = p_token_hash
     and t.product_id = p.id
     and t.expires_at > now()
     and t.download_count < t.max_downloads
  returning p.file_path, p.name;
$$;

-- RLS: przeglądarka nie ma dostępu do niczego. Wszystko idzie przez funkcje /api (klucz service_role).
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.download_tokens enable row level security;

revoke all on function public.consume_download(text) from public, anon, authenticated;

-- Przykład dodania produktu (uzupełnij prawdziwymi danymi, potem usuń komentarz):
-- insert into public.products (slug, name, description, price_amount, file_path, sort)
-- values ('e8-exam', 'E8 Exam', 'Materiały wspierające przygotowanie do egzaminu ósmoklasisty z języka angielskiego.', 0000, 'e8/e8-exam.pdf', 1);
