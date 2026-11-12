-- Hektars Terrain : actions cochées et sessions d'appels (partagées entre téléphone et ordinateur).
-- À coller dans Supabase > SQL Editor > Run. Peut être relancé sans risque.
create table if not exists public.actions_done(
  k text primary key,
  rep_name text not null,
  done_by text,
  done_at timestamptz not null default now()
);
alter table public.actions_done add column if not exists result text; -- commandé / promesse / pas commandé / pas répondu
alter table public.actions_done enable row level security;
drop policy if exists ad_read on public.actions_done;
drop policy if exists ad_write on public.actions_done;
drop policy if exists ad_delete on public.actions_done;
create policy ad_read on public.actions_done for select to authenticated using (public.is_admin() or rep_name = (public.me()).rep_name);
create policy ad_write on public.actions_done for all to authenticated using (public.is_admin() or rep_name = (public.me()).rep_name) with check (public.is_admin() or rep_name = (public.me()).rep_name);

-- Sessions d'appels
create table if not exists public.call_sessions(
  id uuid primary key default gen_random_uuid(),
  rep_name text not null,
  name text not null,
  products jsonb not null default '[]',
  created_by text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.call_sessions enable row level security;
drop policy if exists cs_all on public.call_sessions;
create policy cs_all on public.call_sessions for all to authenticated using (public.is_admin() or rep_name = (public.me()).rep_name) with check (public.is_admin() or rep_name = (public.me()).rep_name);

-- Lancements SL (objectif 80 % en 6 semaines) et plan de répartition dans les sessions
alter table public.call_sessions add column if not exists plan jsonb;
create table if not exists public.sl_launches(
  id uuid primary key default gen_random_uuid(),
  fam_key text not null,
  qty numeric not null,
  period text,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.sl_launches enable row level security;
drop policy if exists sl_read on public.sl_launches;
drop policy if exists sl_write on public.sl_launches;
create policy sl_read on public.sl_launches for select to authenticated using (public.is_member());
create policy sl_write on public.sl_launches for insert to authenticated with check (public.is_member());
