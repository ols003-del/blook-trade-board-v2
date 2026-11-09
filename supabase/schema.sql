-- WARNING: Review this SQL and run it in Supabase Dashboard > SQL Editor.
-- It creates public listings and messages with row-level security enabled.

create extension if not exists pgcrypto;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_username text not null check (char_length(game_username) between 1 and 30),
  offers jsonb not null default '[]'::jsonb check (jsonb_typeof(offers) = 'array'),
  wants jsonb not null default '[]'::jsonb check (jsonb_typeof(wants) = 'array'),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint messages_sender_recipient_differ check (sender_id <> recipient_id)
);

create index if not exists listings_active_created_idx on public.listings(status, created_at desc);
create index if not exists listings_owner_idx on public.listings(owner_id);
create index if not exists messages_listing_created_idx on public.messages(listing_id, created_at desc);
create index if not exists messages_participants_idx on public.messages(sender_id, recipient_id, created_at desc);

alter table public.listings enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Anyone can read active listings" on public.listings;
create policy "Anyone can read active listings" on public.listings
  for select using (status = 'active' or owner_id = (select auth.uid()));

drop policy if exists "Signed-in users can create their own listings" on public.listings;
create policy "Signed-in users can create their own listings" on public.listings
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update their listings" on public.listings;
create policy "Owners can update their listings" on public.listings
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete their listings" on public.listings;
create policy "Owners can delete their listings" on public.listings
  for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "Participants can read their messages" on public.messages;
create policy "Participants can read their messages" on public.messages
  for select to authenticated using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

drop policy if exists "Signed-in users can message another listing owner" on public.messages;
create policy "Signed-in users can message another listing owner" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and sender_id <> recipient_id
    and exists (
      select 1 from public.listings
      where listings.id = listing_id
        and listings.owner_id = recipient_id
        and listings.status = 'active'
    )
  );

-- Keep client-supplied update timestamps fresh on listing edits.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- Optional: enable Realtime for messages in Database > Replication if you later
-- want live chat updates. This prototype loads inbox messages on demand.
