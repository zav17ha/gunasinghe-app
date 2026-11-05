-- Gunasinghe Group — Supabase setup
-- Paste all of this into Supabase → SQL Editor → New query, then press Run.
-- Safe to run again: it skips anything that already exists.
-- You do NOT need to type any names or emails here. The first time you open the
-- app, it asks you to create the owner account, and you add the other users in Settings.

-- 1. Who may use the app. The app's server function fills this in.
create table if not exists public.members (
  email text primary key
);
alter table public.members add column if not exists username text unique;
alter table public.members add column if not exists name text;
alter table public.members add column if not exists role text not null default 'member';
alter table public.members enable row level security;
-- No policies on purpose: phones can't read or change this list. Only the
-- app's server function (with the secret key) and the Supabase dashboard can.

create or replace function public.is_member()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 2. All records: hires, costs, driver payments, gate passes, settings.
--    coll = which list it belongs to, data = the entry itself.
create table if not exists public.records (
  coll        text not null,
  id          text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid(),
  primary key (coll, id)
);
alter table public.records enable row level security;

drop policy if exists "members read"   on public.records;
drop policy if exists "members insert" on public.records;
drop policy if exists "members update" on public.records;
drop policy if exists "members delete" on public.records;
create policy "members read"   on public.records for select to authenticated using (public.is_member());
create policy "members insert" on public.records for insert to authenticated with check (public.is_member());
create policy "members update" on public.records for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "members delete" on public.records for delete to authenticated using (public.is_member());

-- Live updates between phones
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;

-- 3. Private storage for photos of bills and gate passes (max 5 MB each)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bills', 'bills', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "members read bills"   on storage.objects;
drop policy if exists "members add bills"    on storage.objects;
drop policy if exists "members delete bills" on storage.objects;
create policy "members read bills"   on storage.objects for select to authenticated using (bucket_id = 'bills' and public.is_member());
create policy "members add bills"    on storage.objects for insert to authenticated with check (bucket_id = 'bills' and public.is_member());
create policy "members delete bills" on storage.objects for delete to authenticated using (bucket_id = 'bills' and public.is_member());
