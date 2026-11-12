-- Hektars Terrain : actions cochées dans le tableau de bord (partagées entre téléphone et ordinateur).
-- À coller dans Supabase > SQL Editor > Run. Peut être relancé sans risque.
create table if not exists public.actions_done(
  k text primary key,
  rep_name text not null,
  done_by text,
  done_at timestamptz not null default now()
);
alter table public.actions_done enable row level security;
drop policy if exists ad_read on public.actions_done;
drop policy if exists ad_write on public.actions_done;
drop policy if exists ad_delete on public.actions_done;
create policy ad_read on public.actions_done for select to authenticated using (public.is_admin() or rep_name = (public.me()).rep_name);
create policy ad_write on public.actions_done for all to authenticated using (public.is_admin() or rep_name = (public.me()).rep_name) with check (public.is_admin() or rep_name = (public.me()).rep_name);
