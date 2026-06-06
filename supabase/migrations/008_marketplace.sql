-- Create marketplace_listings table
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric not null,
  images text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create marketplace_comments table
create table if not exists public.marketplace_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  parent_id uuid references public.marketplace_comments (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_comments enable row level security;

-- Enable replica identities to FULL for realtime
alter table public.marketplace_listings replica identity full;
alter table public.marketplace_comments replica identity full;

-- Policies for marketplace_listings
drop policy if exists "Listings are readable by everyone" on public.marketplace_listings;
create policy "Listings are readable by everyone"
  on public.marketplace_listings for select
  using (true);

drop policy if exists "Authenticated users can create listings" on public.marketplace_listings;
create policy "Authenticated users can create listings"
  on public.marketplace_listings for insert
  to authenticated
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can update their own listings" on public.marketplace_listings;
create policy "Sellers can update their own listings"
  on public.marketplace_listings for update
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can delete their own listings" on public.marketplace_listings;
create policy "Sellers can delete their own listings"
  on public.marketplace_listings for delete
  to authenticated
  using (auth.uid() = seller_id);

-- Policies for marketplace_comments
drop policy if exists "Comments are readable by everyone" on public.marketplace_comments;
create policy "Comments are readable by everyone"
  on public.marketplace_comments for select
  using (true);

drop policy if exists "Authenticated users can create comments" on public.marketplace_comments;
create policy "Authenticated users can create comments"
  on public.marketplace_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.marketplace_comments;
create policy "Users can delete their own comments"
  on public.marketplace_comments for delete
  to authenticated
  using (auth.uid() = user_id);
