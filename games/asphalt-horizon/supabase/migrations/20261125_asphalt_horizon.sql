-- Asphalt Horizon — database schema and security model (Supabase / Postgres 15+)
--
-- Security model
--   * Every table has Row Level Security enabled.
--   * Clients (anon / authenticated) have NO insert/update/delete rights on any table.
--     All writes go through SECURITY DEFINER functions with a pinned, empty search_path,
--     which validate input, use server-side price lists and recompute rewards themselves.
--   * A player can only read their own profile and the parties they belong to.
--   * Party join attempts are rate-limited (anti brute-force of party codes);
--     race results are rate-limited and capped (anti point-farming).
--   * Realtime party channels are private: only members of a party can send/receive on "party:<code>".
--   * The browser only ever holds the publishable (anon) key. The service_role key is never used by the game.

begin;

-- ---------------------------------------------------------------- catalog (server-side price lists)
create table if not exists public.ah_cars (
  id text primary key,
  min_level integer not null,
  price integer not null check (price >= 0),
  tier numeric not null
);
create table if not exists public.ah_upgrades (id text primary key, base integer not null);
create table if not exists public.ah_boosts (id text primary key, price integer not null);
create table if not exists public.ah_cities (id text primary key, mult numeric not null);

insert into public.ah_cars (id, min_level, price, tier) values
  ('samand', 1, 0, 1.00), ('vento', 1, 1500, 1.45), ('m4csl', 1, 5000, 1.90),
  ('mc720', 1, 10000, 2.35), ('phantom', 1, 18000, 2.80), ('amgone', 1, 30000, 3.25)
on conflict (id) do update set min_level = excluded.min_level, price = excluded.price, tier = excluded.tier;
insert into public.ah_upgrades (id, base) values ('engine', 320), ('tires', 260), ('nitro', 290), ('boost', 240)
on conflict (id) do update set base = excluded.base;
insert into public.ah_boosts (id, price) values ('freeze', 250), ('fly', 300), ('nitro', 200)
on conflict (id) do update set price = excluded.price;
insert into public.ah_cities (id, mult) values ('sf', 1.0), ('rio', 1.15), ('bcn', 1.3), ('ny', 1.5), ('waw', 1.7),
  ('milan', 1.9), ('rome', 2.1), ('msk', 2.4), ('cairo', 2.7), ('paris', 3.0)
on conflict (id) do update set mult = excluded.mult;

alter table public.ah_cars enable row level security;
alter table public.ah_upgrades enable row level security;
alter table public.ah_boosts enable row level security;
alter table public.ah_cities enable row level security;
drop policy if exists "catalog readable" on public.ah_cars;
drop policy if exists "catalog readable" on public.ah_upgrades;
drop policy if exists "catalog readable" on public.ah_boosts;
drop policy if exists "catalog readable" on public.ah_cities;
create policy "catalog readable" on public.ah_cars for select to anon, authenticated using (true);
create policy "catalog readable" on public.ah_upgrades for select to anon, authenticated using (true);
create policy "catalog readable" on public.ah_boosts for select to anon, authenticated using (true);
create policy "catalog readable" on public.ah_cities for select to anon, authenticated using (true);

-- ---------------------------------------------------------------- player profiles
create table if not exists public.ah_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 3 and 20),
  pts integer not null default 1000 check (pts >= 0),
  xp integer not null default 0 check (xp >= 0),
  owned text[] not null default array['samand'],
  sel text not null default 'samand',
  ups jsonb not null default '{}'::jsonb,
  boosts jsonb not null default '{"freeze": 2, "fly": 2, "nitro": 2}'::jsonb,
  best jsonb not null default '{}'::jsonb,
  cleared jsonb not null default '{}'::jsonb,
  cosm jsonb not null default '{}'::jsonb check (pg_column_size(cosm) < 4096),
  races integer not null default 0,
  wins integer not null default 0,
  last_race_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ah_profiles add column if not exists cleared jsonb not null default '{}'::jsonb;  -- best place per city (podium unlocks the next map)
-- car line-up v2: the starter is the Samand; cars that left the game are refunded at their old price
alter table public.ah_profiles alter column owned set default array['samand'];
alter table public.ah_profiles alter column sel set default 'samand';
do $$
declare r record; refund integer; k text; old_price jsonb := '{"raptor": 1500, "nebula": 4000, "falco": 8000, "tempest": 15000}';
begin
  for r in select id, owned, ups, sel from public.ah_profiles where owned && array['raptor', 'nebula', 'falco', 'tempest'] or not ('samand' = any (owned)) loop
    refund := 0;
    foreach k in array array['raptor', 'nebula', 'falco', 'tempest'] loop
      if k = any (r.owned) then refund := refund + (old_price ->> k)::integer; end if;
    end loop;
    update public.ah_profiles set
      pts = pts + refund,
      owned = array(select distinct unnest(array_append(array_remove(array_remove(array_remove(array_remove(owned, 'raptor'), 'nebula'), 'falco'), 'tempest'), 'samand'))),
      ups = ups - 'raptor' - 'nebula' - 'falco' - 'tempest',
      sel = case when sel in ('raptor', 'nebula', 'falco', 'tempest') then 'samand' else sel end,
      updated_at = now()
    where id = r.id;
  end loop;
end $$;
delete from public.ah_cars where id in ('raptor', 'nebula', 'falco', 'tempest');
alter table public.ah_profiles enable row level security;
drop policy if exists "read own profile" on public.ah_profiles;
create policy "read own profile" on public.ah_profiles for select to authenticated using ((select auth.uid()) = id);

-- ---------------------------------------------------------------- parties
create table if not exists public.ah_parties (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '6 hours'
);
create table if not exists public.ah_party_members (
  party_code text not null references public.ah_parties (code) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null,
  joined_at timestamptz not null default now(),
  primary key (party_code, user_id)
);
create index if not exists ah_party_members_user_idx on public.ah_party_members (user_id);
create table if not exists public.ah_join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists ah_join_attempts_idx on public.ah_join_attempts (user_id, at);

alter table public.ah_parties enable row level security;
alter table public.ah_party_members enable row level security;
alter table public.ah_join_attempts enable row level security;  -- no policies: invisible to clients

-- membership check used by policies (definer → no RLS recursion)
create or replace function public.ah_is_member(p_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ah_party_members m join public.ah_parties p on p.code = m.party_code
    where m.party_code = p_code and m.user_id = (select auth.uid()) and p.expires_at > now()
  );
$$;

drop policy if exists "members read party" on public.ah_parties;
create policy "members read party" on public.ah_parties for select to authenticated using (public.ah_is_member(code));
drop policy if exists "members read members" on public.ah_party_members;
create policy "members read members" on public.ah_party_members for select to authenticated using (public.ah_is_member(party_code));

-- ---------------------------------------------------------------- table privileges: read-only for clients
revoke all on public.ah_profiles, public.ah_parties, public.ah_party_members, public.ah_join_attempts,
              public.ah_cars, public.ah_upgrades, public.ah_boosts, public.ah_cities from anon, authenticated;
grant select on public.ah_profiles, public.ah_parties, public.ah_party_members to authenticated;
grant select on public.ah_cars, public.ah_upgrades, public.ah_boosts, public.ah_cities to anon, authenticated;

-- ---------------------------------------------------------------- helpers
create or replace function public.ah_level(p_xp integer)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, floor((1 + sqrt(1 + 4 * greatest(p_xp, 0)::numeric / 75)) / 2)::integer);
$$;

create or replace function public.ah_clean_nick(p text)
returns text language plpgsql immutable set search_path = '' as $$
declare n text;
begin
  n := btrim(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9_ .\-ĄĆĘŁŃÓŚŹŻąćęłńóśźż]', '', 'g'));
  n := substr(n, 1, 20);
  if char_length(n) < 3 then n := 'Kierowca' || lpad((floor(random() * 10000))::int::text, 4, '0'); end if;
  return n;
end $$;

create or replace function public.ah_profile_json(p public.ah_profiles)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('nickname', p.nickname, 'pts', p.pts, 'xp', p.xp, 'level', public.ah_level(p.xp),
    'owned', to_jsonb(p.owned), 'sel', p.sel, 'ups', p.ups, 'boosts', p.boosts, 'best', p.best, 'cleared', p.cleared, 'cosm', p.cosm,
    'races', p.races, 'wins', p.wins);
$$;

-- ---------------------------------------------------------------- profile RPCs
create or replace function public.ah_get_profile()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); u record; prof public.ah_profiles;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into prof from public.ah_profiles where id = uid;
  if not found then
    select raw_user_meta_data, email into u from auth.users where id = uid;
    insert into public.ah_profiles (id, nickname)
    values (uid, public.ah_clean_nick(coalesce(u.raw_user_meta_data ->> 'nickname', u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))))
    on conflict (id) do nothing;
    select * into prof from public.ah_profiles where id = uid;
  end if;
  return public.ah_profile_json(prof);
end $$;

create or replace function public.ah_set_nickname(p_nickname text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prof public.ah_profiles;
begin
  update public.ah_profiles set nickname = public.ah_clean_nick(p_nickname), updated_at = now()
  where id = (select auth.uid()) returning * into prof;
  if not found then raise exception 'not_found'; end if;
  return public.ah_profile_json(prof);
end $$;

create or replace function public.ah_select_car(p_car text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prof public.ah_profiles;
begin
  update public.ah_profiles set sel = p_car, updated_at = now()
  where id = (select auth.uid()) and p_car = any (owned) returning * into prof;
  if not found then raise exception 'not_owned'; end if;
  return public.ah_profile_json(prof);
end $$;

create or replace function public.ah_set_cosmetics(p_car text, p_cosm jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prof public.ah_profiles; c jsonb := '{}'::jsonb;
begin
  select * into prof from public.ah_profiles where id = (select auth.uid()) for update;
  if not found or not (p_car = any (prof.owned)) then raise exception 'not_owned'; end if;
  -- whitelist + validate every field
  if jsonb_typeof(p_cosm -> 'color') = 'number' and (p_cosm ->> 'color')::bigint between 0 and 16777215 then c := c || jsonb_build_object('color', (p_cosm ->> 'color')::bigint); end if;
  if p_cosm ->> 'finish' in ('metallic', 'gloss', 'pearl', 'matte') then c := c || jsonb_build_object('finish', p_cosm ->> 'finish'); end if;
  if p_cosm ->> 'rim' in ('silver', 'gunmetal', 'black', 'bronze', 'gold') then c := c || jsonb_build_object('rim', p_cosm ->> 'rim'); end if;
  if p_cosm ? 'neon' then
    if jsonb_typeof(p_cosm -> 'neon') = 'null' then c := c || '{"neon": null}'::jsonb;
    elsif jsonb_typeof(p_cosm -> 'neon') = 'number' and (p_cosm ->> 'neon')::bigint between 0 and 16777215 then c := c || jsonb_build_object('neon', (p_cosm ->> 'neon')::bigint); end if;
  end if;
  update public.ah_profiles set cosm = jsonb_set(cosm, array[p_car], coalesce(cosm -> p_car, '{}'::jsonb) || c), updated_at = now()
  where id = prof.id returning * into prof;
  return public.ah_profile_json(prof);
end $$;

create or replace function public.ah_purchase(p_kind text, p_item text, p_sub text default null, p_n integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prof public.ah_profiles; car public.ah_cars; cost integer; lvl integer; base integer; price integer;
begin
  select * into prof from public.ah_profiles where id = (select auth.uid()) for update;
  if not found then raise exception 'not_found'; end if;
  if p_kind = 'car' then
    select * into car from public.ah_cars where id = p_item;
    if not found then raise exception 'unknown_item'; end if;
    if p_item = any (prof.owned) then raise exception 'already_owned'; end if;
    if prof.pts < car.price then raise exception 'not_enough_points'; end if;
    update public.ah_profiles set pts = pts - car.price, owned = array_append(owned, p_item), sel = p_item, updated_at = now()
    where id = prof.id returning * into prof;
  elsif p_kind = 'upgrade' then
    select * into car from public.ah_cars where id = p_item;
    if not found or not (p_item = any (prof.owned)) then raise exception 'not_owned'; end if;
    select u.base into base from public.ah_upgrades u where u.id = p_sub;
    if base is null then raise exception 'unknown_item'; end if;
    lvl := coalesce((prof.ups -> p_item ->> p_sub)::integer, 0);
    if lvl >= 5 then raise exception 'max_level'; end if;
    cost := (round(base * (lvl + 1) * car.tier / 10) * 10)::integer;
    if prof.pts < cost then raise exception 'not_enough_points'; end if;
    update public.ah_profiles set pts = pts - cost,
      ups = jsonb_set(ups, array[p_item], coalesce(ups -> p_item, '{}'::jsonb) || jsonb_build_object(p_sub, lvl + 1)), updated_at = now()
    where id = prof.id returning * into prof;
  elsif p_kind = 'boost' then
    select b.price into price from public.ah_boosts b where b.id = p_item;
    if price is null or p_n not in (1, 5) then raise exception 'unknown_item'; end if;
    cost := case when p_n = 5 then price * 4 else price end;
    if prof.pts < cost then raise exception 'not_enough_points'; end if;
    update public.ah_profiles set pts = pts - cost,
      boosts = jsonb_set(boosts, array[p_item], to_jsonb(least(999, coalesce((boosts ->> p_item)::integer, 0) + p_n))), updated_at = now()
    where id = prof.id returning * into prof;
  else
    raise exception 'unknown_kind';
  end if;
  return public.ah_profile_json(prof);
end $$;

-- race results: inputs are capped and the reward is recomputed on the server
drop function if exists public.ah_submit_race(text, integer, integer, integer, integer, numeric, jsonb, jsonb);
-- p_quest: points for tasks finished in this race (reported by the client, capped)
create or replace function public.ah_submit_race(p_city text, p_place integer, p_coins integer, p_takedowns integer, p_near integer,
                                                p_time numeric, p_used jsonb, p_picked jsonb, p_quest integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prof public.ah_profiles; mult numeric; reward integer; gain_xp integer; coin_mult numeric; b jsonb; k text;
        used integer; picked integer; picked_total integer := 0; v_best numeric;
begin
  select * into prof from public.ah_profiles where id = (select auth.uid()) for update;
  if not found then raise exception 'not_found'; end if;
  select c.mult into mult from public.ah_cities c where c.id = p_city;
  if mult is null then raise exception 'unknown_city'; end if;
  if p_place not between 1 and 6 or p_coins not between 0 and 150 or p_takedowns not between 0 and 40
     or p_near not between 0 and 80 or p_time not between 45 and 1800 or coalesce(p_quest, 0) not between 0 and 12000 then raise exception 'invalid_result'; end if;
  if prof.last_race_at is not null and now() - prof.last_race_at < interval '40 seconds' then raise exception 'too_fast'; end if;

  coin_mult := 1 + 0.1 * coalesce((prof.ups -> prof.sel ->> 'boost')::integer, 0);
  reward := round((array[1000, 700, 500, 350, 250, 150])[p_place] * mult + p_coins * 15 * coin_mult + p_takedowns * 150 + p_near * 25) + coalesce(p_quest, 0);
  gain_xp := round((array[300, 220, 170, 130, 100, 80])[p_place] * (1 + (mult - 1) * 0.5));

  b := prof.boosts;
  foreach k in array array['freeze', 'fly', 'nitro'] loop
    used := least(greatest(coalesce((p_used ->> k)::integer, 0), 0), 50);
    picked := least(greatest(coalesce((p_picked ->> k)::integer, 0), 0), 8);
    picked_total := picked_total + picked;
    b := jsonb_set(b, array[k], to_jsonb(least(999, greatest(0, coalesce((b ->> k)::integer, 0) - used) + picked)));
  end loop;
  if picked_total > 12 then raise exception 'invalid_result'; end if;

  v_best := (prof.best ->> p_city)::numeric;
  update public.ah_profiles set
    pts = pts + reward, xp = xp + gain_xp, races = races + 1, wins = wins + (case when p_place = 1 then 1 else 0 end),
    boosts = b,
    best = case when v_best is null or p_time < v_best then jsonb_set(prof.best, array[p_city], to_jsonb(p_time)) else prof.best end,
    cleared = case when (prof.cleared ->> p_city) is null or p_place < (prof.cleared ->> p_city)::integer
                   then jsonb_set(prof.cleared, array[p_city], to_jsonb(p_place)) else prof.cleared end,
    last_race_at = now(), updated_at = now()
  where id = prof.id returning * into prof;
  return jsonb_build_object('reward', reward, 'xp', gain_xp, 'profile', public.ah_profile_json(prof));
end $$;

-- ---------------------------------------------------------------- party RPCs
create or replace function public.ah_create_party()
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; bytes bytea; i int; tries int := 0; nick text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  delete from public.ah_parties where expires_at < now();
  delete from public.ah_parties where host_id = uid;
  delete from public.ah_party_members where user_id = uid;
  select nickname into nick from public.ah_profiles where id = uid;
  loop
    bytes := extensions.gen_random_bytes(6); code := '';
    for i in 0..5 loop code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1); end loop;
    begin
      insert into public.ah_parties (code, host_id) values (code, uid);
      exit;
    exception when unique_violation then
      tries := tries + 1; if tries > 10 then raise exception 'code_collision'; end if;
    end;
  end loop;
  insert into public.ah_party_members (party_code, user_id, nickname) values (code, uid, coalesce(nick, 'Kierowca'));
  return code;
end $$;

create or replace function public.ah_join_party(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c text := upper(btrim(coalesce(p_code, ''))); party public.ah_parties; n int; nick text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  -- brute-force protection: max 15 attempts per 10 minutes per account
  delete from public.ah_join_attempts where at < now() - interval '1 hour';
  select count(*) into n from public.ah_join_attempts where user_id = uid and at > now() - interval '10 minutes';
  if n >= 15 then raise exception 'rate_limited'; end if;
  -- the attempt must stay recorded, so failures RETURN an error instead of raising (a raise would roll it back)
  insert into public.ah_join_attempts (user_id) values (uid);
  if c !~ '^[A-HJ-NP-Z2-9]{6}$' then return jsonb_build_object('error', 'invalid_code'); end if;
  select * into party from public.ah_parties where code = c and expires_at > now();
  if not found then return jsonb_build_object('error', 'party_not_found'); end if;
  select count(*) into n from public.ah_party_members where party_code = c and user_id <> uid;
  if n >= 6 then return jsonb_build_object('error', 'party_full'); end if;
  delete from public.ah_party_members where user_id = uid and party_code <> c;
  select nickname into nick from public.ah_profiles where id = uid;
  insert into public.ah_party_members (party_code, user_id, nickname) values (c, uid, coalesce(nick, 'Kierowca'))
  on conflict (party_code, user_id) do nothing;
  return jsonb_build_object('code', c, 'host_id', party.host_id);
end $$;

create or replace function public.ah_leave_party()
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  delete from public.ah_party_members where user_id = uid;
  delete from public.ah_parties where host_id = uid;
end $$;

-- ---------------------------------------------------------------- function privileges
revoke execute on all functions in schema public from public, anon;
grant execute on function public.ah_get_profile(), public.ah_set_nickname(text), public.ah_select_car(text),
  public.ah_set_cosmetics(text, jsonb), public.ah_purchase(text, text, text, integer),
  public.ah_submit_race(text, integer, integer, integer, integer, numeric, jsonb, jsonb, integer),
  public.ah_create_party(), public.ah_join_party(text), public.ah_leave_party(), public.ah_is_member(text)
  to authenticated;

-- ---------------------------------------------------------------- Realtime: private party channels
-- Only members of a party may send to / receive from the channel topic "party:<code>" (broadcast + presence).
alter table if exists realtime.messages enable row level security;
drop policy if exists "ah party members receive" on realtime.messages;
create policy "ah party members receive" on realtime.messages for select to authenticated
  using (realtime.topic() like 'party:%' and public.ah_is_member(split_part(realtime.topic(), ':', 2)));
drop policy if exists "ah party members send" on realtime.messages;
create policy "ah party members send" on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'party:%' and public.ah_is_member(split_part(realtime.topic(), ':', 2)));

commit;
