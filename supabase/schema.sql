-- Hektars Terrain : schéma Supabase
create table public.reps(email text primary key check (email = lower(email)), rep_name text not null, role text not null default 'rep' check (role in ('rep','admin')));
create table public.snapshots(id bigint generated always as identity primary key, ref text not null, extracted_at timestamptz not null default now(), shared jsonb not null, created_by text);
create table public.rep_snapshots(snapshot_id bigint not null references public.snapshots(id) on delete cascade, rep_name text not null, payload jsonb not null, primary key(snapshot_id, rep_name));
create table public.product_settings(fam_key text primary key, saq_type text check (saq_type in ('RA','SA','SL')), active boolean not null default true, pitch text, photos text[] not null default '{}', updated_at timestamptz default now(), updated_by text);

create or replace function public.me() returns public.reps language sql stable security definer set search_path = public as
$$ select * from public.reps where email = lower(auth.jwt()->>'email') $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' from public.reps where email = lower(auth.jwt()->>'email')), false) $$;
create or replace function public.is_member() returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.reps where email = lower(auth.jwt()->>'email')) $$;

alter table public.reps enable row level security;
alter table public.snapshots enable row level security;
alter table public.rep_snapshots enable row level security;
alter table public.product_settings enable row level security;

create policy reps_read on public.reps for select to authenticated using (email = lower(auth.jwt()->>'email') or public.is_admin());
create policy reps_admin on public.reps for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy snap_read on public.snapshots for select to authenticated using (public.is_member());
create policy snap_write on public.snapshots for insert to authenticated with check (public.is_admin());
create policy rs_read on public.rep_snapshots for select to authenticated using (public.is_admin() or rep_name = (public.me()).rep_name);
create policy rs_write on public.rep_snapshots for insert to authenticated with check (public.is_admin());
create policy ps_read on public.product_settings for select to authenticated using (public.is_member());
create policy ps_write on public.product_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets(id, name, public) values ('product-photos','product-photos', true) on conflict do nothing;
create policy photos_admin_write on storage.objects for insert to authenticated with check (bucket_id = 'product-photos' and public.is_admin());
create policy photos_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'product-photos' and public.is_admin());
