-- Talking Flashcards V2 schema
-- Run this in Supabase SQL Editor.

create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id bigint generated always as identity primary key,
  category_id bigint references categories(id) on delete cascade,
  word text not null,
  image_url text,
  audio_url text,
  owner_id uuid references auth.users(id) on delete cascade,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table cards enable row level security;

drop policy if exists "Read public or own categories" on categories;
drop policy if exists "Insert own categories" on categories;
drop policy if exists "Update own categories" on categories;
drop policy if exists "Delete own categories" on categories;

drop policy if exists "Read public or own cards" on cards;
drop policy if exists "Insert own cards" on cards;
drop policy if exists "Update own cards" on cards;
drop policy if exists "Delete own cards" on cards;

create policy "Read public or own categories"
on categories
for select
using (is_public = true or owner_id = auth.uid());

create policy "Insert own categories"
on categories
for insert
with check (owner_id = auth.uid() and is_public = false);

create policy "Update own categories"
on categories
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Delete own categories"
on categories
for delete
using (owner_id = auth.uid());

create policy "Read public or own cards"
on cards
for select
using (is_public = true or owner_id = auth.uid());

create policy "Insert own cards"
on cards
for insert
with check (owner_id = auth.uid() and is_public = false);

create policy "Update own cards"
on cards
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Delete own cards"
on cards
for delete
using (owner_id = auth.uid());

insert into categories (name, is_public, owner_id)
values
('Alphabet', true, null),
('Numbers', true, null),
('Animals', true, null),
('Objects', true, null),
('Colours', true, null);

insert into storage.buckets (id, name, public)
values
('private-images', 'private-images', true),
('private-audio', 'private-audio', true)
on conflict (id) do nothing;

-- Prototype storage policies.
-- These buckets are public for easy playback. For production, switch to private signed URLs.

drop policy if exists "Users upload own private images" on storage.objects;
drop policy if exists "Users upload own private audio" on storage.objects;
drop policy if exists "Public read private images prototype" on storage.objects;
drop policy if exists "Public read private audio prototype" on storage.objects;

create policy "Users upload own private images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users upload own private audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public read private images prototype"
on storage.objects
for select
to public
using (bucket_id = 'private-images');

create policy "Public read private audio prototype"
on storage.objects
for select
to public
using (bucket_id = 'private-audio');
