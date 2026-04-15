-- ============================================================
-- Fitness Dashboard — Supabase Database Setup
-- Run this once in your Supabase project: SQL Editor → New query
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────

create table public.strength_sessions (
  id               text primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  date             text not null,
  duration_minutes integer not null default 60,
  total_volume_kg  integer not null default 0,
  notes            text not null default '',
  sets             jsonb not null default '[]'::jsonb,
  created_at       timestamptz default now() not null
);

create table public.body_entries (
  id           text primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  date         text not null,
  weight_kg    numeric(5,2) not null,
  body_fat_pct numeric(4,1),
  notes        text not null default '',
  created_at   timestamptz default now() not null
);

create table public.nutrition_entries (
  id         text primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       text not null,
  calories   integer not null,
  protein_g  numeric(5,1),
  carbs_g    numeric(5,1),
  fat_g      numeric(5,1),
  notes      text not null default '',
  created_at timestamptz default now() not null
);

create table public.user_profiles (
  user_id              uuid references auth.users(id) on delete cascade primary key,
  height_cm            numeric(5,1) not null default 173,
  weight_kg            numeric(5,2) not null default 81,
  age_years            integer not null default 34,
  sex                  text not null default 'male',
  body_fat_pct         numeric(4,1),
  goal_calorie_surplus integer not null default 300,
  updated_at           timestamptz default now() not null
);

-- ── Row Level Security ────────────────────────────────────────
-- Each user can only read/write their own rows.

alter table public.strength_sessions  enable row level security;
alter table public.body_entries        enable row level security;
alter table public.nutrition_entries   enable row level security;
alter table public.user_profiles       enable row level security;

create policy "own strength_sessions"  on public.strength_sessions  for all using (auth.uid() = user_id);
create policy "own body_entries"        on public.body_entries        for all using (auth.uid() = user_id);
create policy "own nutrition_entries"   on public.nutrition_entries   for all using (auth.uid() = user_id);
create policy "own user_profiles"       on public.user_profiles       for all using (auth.uid() = user_id);

-- ── Auto-set user_id on insert ────────────────────────────────

create or replace function public.set_user_id()
returns trigger language plpgsql security definer as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger set_user_id_strength   before insert on public.strength_sessions  for each row execute function public.set_user_id();
create trigger set_user_id_body       before insert on public.body_entries        for each row execute function public.set_user_id();
create trigger set_user_id_nutrition  before insert on public.nutrition_entries   for each row execute function public.set_user_id();
create trigger set_user_id_profile    before insert on public.user_profiles       for each row execute function public.set_user_id();
