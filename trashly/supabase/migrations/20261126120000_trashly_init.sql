-- Trashly – schemat bazy danych (Supabase / PostgreSQL 15+)
-- Zasada: tabele z danymi harmonogramów zapisuje WYŁĄCZNIE backend (klucz service_role, omija RLS).
-- Klient (anon/authenticated) czyta tylko dane publiczne i własne rekordy.

create extension if not exists pgcrypto;

-- ===== Słowniki =====
create table if not exists municipalities (
  id                text primary key,                 -- 'zory', 'warszawa'…
  name              text not null,
  teryt             char(6) not null unique,          -- kod gminy z PRG/TERYT
  voivodeship       text not null,
  official_info_url text not null,
  pszok_url         text,
  capabilities      jsonb not null default '{}'::jsonb,
  rules             jsonb not null default '{}'::jsonb,
  integration_note  text,
  created_at        timestamptz not null default now()
);

create table if not exists waste_categories (
  key          text primary key,                      -- 'zmieszane', 'plastik'…
  name         text not null,
  container    text not null,
  color        text,                                  -- null = kolor nieokreślony przepisami
  legal_basis  text
);

create table if not exists data_sources (
  id              uuid primary key default gen_random_uuid(),
  municipality_id text not null references municipalities(id) on delete cascade,
  url             text not null,
  type            text not null check (type in ('API','HTML','PDF','REGISTRY')),
  title           text not null,
  last_seen_at    timestamptz not null default now(),
  unique (municipality_id, url)
);

-- Pobrane dokumenty źródłowe (PDF itp.) z hashem – wykrywanie nowych wersji.
create table if not exists source_documents (
  url             text primary key,
  municipality_id text not null references municipalities(id) on delete cascade,
  sha256          char(64) not null,
  fetched_at      timestamptz not null,
  first_seen_at   timestamptz not null,
  parsed          jsonb,
  parse_errors    text[] not null default '{}'
);

-- ===== Adresy =====
create table if not exists streets (
  id              uuid primary key default gen_random_uuid(),
  municipality_id text not null references municipalities(id) on delete cascade,
  name            text not null,
  teryt_ulic      char(5),
  aliases         text[] not null default '{}',       -- dawne/alternatywne nazwy
  unique (municipality_id, name)
);

create table if not exists addresses (
  id              uuid primary key default gen_random_uuid(),
  municipality_id text not null references municipalities(id) on delete cascade,
  street_id       uuid references streets(id) on delete set null,
  street_name     text not null,
  number          text not null default '',
  teryt_simc      char(7),
  teryt_ulic      char(5),
  provider_id     text,                               -- np. addressPointId (Warszawa)
  postal_code     text,
  x_2180          double precision,
  y_2180          double precision,
  level           text not null check (level in ('BUILDING_VERIFIED','STREET_VERIFIED','UNVERIFIED')),
  verified_by     text[] not null default '{}',
  verified_at     timestamptz not null default now(),
  unique (municipality_id, street_name, number)
);

create table if not exists collection_zones (
  id              uuid primary key default gen_random_uuid(),
  municipality_id text not null references municipalities(id) on delete cascade,
  zone_key        text not null,
  label           text not null,
  unique (municipality_id, zone_key)
);

-- ===== Harmonogramy =====
create table if not exists collection_schedules (
  key              text primary key,                  -- '<municipality>:<zone_key>'
  municipality_id  text not null references municipalities(id) on delete cascade,
  zone_key         text not null,
  zone_label       text not null,
  version          integer not null check (version > 0),
  hash             char(64) not null,
  events           jsonb not null,                    -- bieżąca wersja (kanoniczna kopia)
  on_demand        text[] not null default '{}',
  source           jsonb not null,                    -- {url, type, title}
  coverage         text not null check (coverage in ('NEXT_ONLY','FULL_PERIOD')),
  period_end       date,
  notes            text[] not null default '{}',
  last_success_at  timestamptz not null,              -- prawdziwy czas ostatniego udanego pobrania
  last_change_at   timestamptz,
  last_attempt_at  timestamptz not null,
  last_error       text,
  failures         integer not null default 0,
  next_check_at    timestamptz not null,
  changes          jsonb not null default '[]'::jsonb,
  refresh_context  jsonb not null
);
create index if not exists collection_schedules_due on collection_schedules (next_check_at);

-- Terminy bieżącej wersji w postaci relacyjnej (zapytania, raporty). Unikalność chroni przed duplikatami.
create table if not exists collection_events (
  id            bigint generated always as identity primary key,
  schedule_key  text not null references collection_schedules(key) on delete cascade,
  version       integer not null,
  date          date not null,
  category      text not null references waste_categories(key),
  raw_name      text not null,
  unique (schedule_key, version, date, category)
);
create index if not exists collection_events_lookup on collection_events (schedule_key, date);

-- Historia: każda poprzednia wersja harmonogramu.
create table if not exists schedule_versions (
  schedule_key  text not null references collection_schedules(key) on delete cascade,
  version       integer not null,
  hash          char(64) not null,
  events        jsonb not null,
  saved_at      timestamptz not null default now(),
  primary key (schedule_key, version),
  unique (schedule_key, hash)
);

create table if not exists update_logs (
  id              bigint generated always as identity primary key,
  at              timestamptz not null default now(),
  municipality_id text not null references municipalities(id) on delete cascade,
  schedule_key    text,
  outcome         text not null check (outcome in ('UNCHANGED','NEW_VERSION','FAILED','SOURCE_CHANGED','REJECTED')),
  message         text not null,
  duration_ms     integer not null default 0
);
create index if not exists update_logs_at on update_logs (at desc);

-- ===== Użytkownicy =====
-- Aplikacja działa bez logowania (identyfikator urządzenia). Profil Supabase Auth jest opcjonalny.
create table if not exists user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  device_id   text unique,
  created_at  timestamptz not null default now()
);

create table if not exists saved_addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  device_id       text,
  municipality_id text not null references municipalities(id),
  address         jsonb not null,
  schedule_key    text references collection_schedules(key) on delete set null,
  created_at      timestamptz not null default now(),
  check (user_id is not null or device_id is not null)
);

create table if not exists notification_preferences (
  device_id      text not null,
  user_id        uuid references auth.users(id) on delete cascade,
  schedule_key   text not null references collection_schedules(key) on delete cascade,
  address        jsonb not null,
  prefs          jsonb not null,                       -- {eveningBefore, eveningTime, collectionDay, morningTime, scheduleChanges}
  created_at     timestamptz not null default now(),
  primary key (device_id, schedule_key)
);

-- Skrzynka powiadomień (outbox) – wysyłkę push/e-mail realizuje osobny worker.
create table if not exists notifications (
  id            uuid primary key,
  device_id     text not null,
  user_id       uuid references auth.users(id) on delete cascade,
  schedule_key  text not null,
  type          text not null check (type in ('SCHEDULE_CHANGED')),
  title         text not null,
  body          text not null,
  changes       jsonb not null,
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  sent_at       timestamptz
);
create index if not exists notifications_device on notifications (device_id, created_at desc);

-- ===== Przewodnik „Co gdzie wyrzucić?” =====
create table if not exists waste_guide_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  category      text not null,                         -- kategoria albo 'pszok'
  instructions  text not null,
  special       text,
  keywords      text not null default ''
);

-- ===== RLS =====
alter table municipalities           enable row level security;
alter table waste_categories         enable row level security;
alter table data_sources             enable row level security;
alter table source_documents         enable row level security;
alter table streets                  enable row level security;
alter table addresses                enable row level security;
alter table collection_zones         enable row level security;
alter table collection_schedules     enable row level security;
alter table collection_events        enable row level security;
alter table schedule_versions        enable row level security;
alter table update_logs              enable row level security;
alter table user_profiles            enable row level security;
alter table saved_addresses          enable row level security;
alter table notification_preferences enable row level security;
alter table notifications            enable row level security;
alter table waste_guide_items        enable row level security;

-- Dane publiczne – tylko odczyt.
create policy "public read municipalities" on municipalities for select using (true);
create policy "public read categories"     on waste_categories for select using (true);
create policy "public read guide"          on waste_guide_items for select using (true);
create policy "public read sources"        on data_sources for select using (true);

-- Własne rekordy zalogowanego użytkownika.
create policy "own profile"   on user_profiles   for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own addresses" on saved_addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifications read" on notifications for select using (user_id = auth.uid());
-- Pozostałe tabele: brak polityk = brak dostępu dla anon/authenticated (tylko service_role backendu).
