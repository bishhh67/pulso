create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, receiver_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references auth.users (id) on delete cascade,
  user_high_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_low_id, user_high_id),
  check (user_low_id <> user_high_id)
);

alter table public.notifications add column if not exists friend_request_id uuid;

do $$
begin
  alter table public.notifications
    add constraint notifications_friend_request_id_fkey
    foreign key (friend_request_id) references public.friend_requests (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create index if not exists friend_requests_requester_idx on public.friend_requests using btree (requester_id, status, created_at desc);
create index if not exists friend_requests_receiver_idx on public.friend_requests using btree (receiver_id, status, created_at desc);
create index if not exists friendships_low_idx on public.friendships using btree (user_low_id);
create index if not exists friendships_high_idx on public.friendships using btree (user_high_id);
create index if not exists notifications_friend_request_idx on public.notifications using btree (friend_request_id);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "Friend requests are readable by participants" on public.friend_requests;
create policy "Friend requests are readable by participants" on public.friend_requests
for select to authenticated
using ((select auth.uid()) = requester_id or (select auth.uid()) = receiver_id);

drop policy if exists "Friend requests can be created by requester" on public.friend_requests;
create policy "Friend requests can be created by requester" on public.friend_requests
for insert to authenticated
with check ((select auth.uid()) = requester_id and requester_id <> receiver_id);

drop policy if exists "Friend requests can be updated by participants" on public.friend_requests;
create policy "Friend requests can be updated by participants" on public.friend_requests
for update to authenticated
using ((select auth.uid()) = requester_id or (select auth.uid()) = receiver_id)
with check ((select auth.uid()) = requester_id or (select auth.uid()) = receiver_id);

drop policy if exists "Friend requests can be deleted by participants" on public.friend_requests;
create policy "Friend requests can be deleted by participants" on public.friend_requests
for delete to authenticated
using ((select auth.uid()) = requester_id or (select auth.uid()) = receiver_id);

drop policy if exists "Friendships are readable by participants" on public.friendships;
create policy "Friendships are readable by participants" on public.friendships
for select to authenticated
using ((select auth.uid()) = user_low_id or (select auth.uid()) = user_high_id);

drop policy if exists "Friendships can be created by participants" on public.friendships;
create policy "Friendships can be created by participants" on public.friendships
for insert to authenticated
with check ((select auth.uid()) = user_low_id or (select auth.uid()) = user_high_id);

drop policy if exists "Friendships can be deleted by participants" on public.friendships;
create policy "Friendships can be deleted by participants" on public.friendships
for delete to authenticated
using ((select auth.uid()) = user_low_id or (select auth.uid()) = user_high_id);
