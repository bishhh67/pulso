create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  name text not null,
  bio text not null default '',
  profile_photo text,
  following text[] not null default '{}',
  followers text[] not null default '{}',
  search_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id text primary key,
  name text not null,
  bio text not null default '',
  image text,
  followers text[] not null default '{}',
  posts text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id text not null,
  author_type text not null check (author_type in ('user', 'club')),
  content text not null default '',
  image text,
  video text,
  video_thumbnail text,
  likes text[] not null default '{}',
  comments jsonb not null default '[]'::jsonb,
  shares integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  from_user_id uuid,
  from_user_name text,
  post_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image text,
  created_by uuid not null references auth.users (id) on delete cascade,
  members uuid[] not null default '{}',
  admins uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  send_by uuid not null references auth.users (id) on delete cascade,
  sender_name text not null,
  text text not null default '',
  type text not null default 'text',
  shared_post jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  send_by uuid not null references auth.users (id) on delete cascade,
  send_to uuid not null references auth.users (id) on delete cascade,
  text text not null default '',
  type text not null default 'text',
  shared_post jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  semester integer not null,
  subject text not null,
  category text not null,
  title text not null,
  type text not null check (type in ('pdf', 'link')),
  url text,
  file_url text,
  file_name text,
  uploaded_by text not null default 'anonymous',
  created_at timestamptz not null default now()
);

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();

create index if not exists profiles_name_idx on public.profiles using btree (name);
create index if not exists posts_created_at_idx on public.posts using btree (created_at desc);
create index if not exists posts_author_idx on public.posts using btree (author_id);
create index if not exists notifications_user_read_idx on public.notifications using btree (user_id, read, created_at desc);
create index if not exists groups_members_idx on public.groups using gin (members);
create index if not exists group_messages_group_created_idx on public.group_messages using btree (group_id, created_at desc);
create index if not exists direct_messages_chat_created_idx on public.direct_messages using btree (chat_id, created_at desc);
create index if not exists notes_lookup_idx on public.notes using btree (department, semester, subject, category, created_at desc);

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.posts enable row level security;
alter table public.notifications enable row level security;
alter table public.groups enable row level security;
alter table public.group_messages enable row level security;
alter table public.direct_messages enable row level security;
alter table public.notes enable row level security;

create policy "Profiles are readable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Clubs are readable by everyone" on public.clubs for select using (true);
create policy "Authenticated users can update clubs" on public.clubs for update to authenticated using (true) with check (true);

create policy "Posts are readable by everyone" on public.posts for select using (true);
create policy "Authenticated users can create posts" on public.posts for insert to authenticated with check (true);
create policy "Authenticated users can update posts" on public.posts for update to authenticated using (true) with check (true);

create policy "Notifications belong to the recipient" on public.notifications for select using ((select auth.uid()) = user_id);
create policy "Notifications can be created for authenticated users" on public.notifications for insert to authenticated with check (true);
create policy "Notifications can be updated by recipient" on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Groups are readable by authenticated users" on public.groups for select to authenticated using (true);
create policy "Authenticated users can create groups" on public.groups for insert to authenticated with check (true);
create policy "Group members can update groups" on public.groups for update to authenticated using (true) with check (true);

create policy "Group members can read messages" on public.group_messages for select to authenticated
using (
  exists (
    select 1
    from public.groups g
    where g.id = group_id
      and g.members @> array[(select auth.uid())]::uuid[]
  )
);
create policy "Group members can create messages" on public.group_messages for insert to authenticated
with check (
  exists (
    select 1
    from public.groups g
    where g.id = group_id
      and g.members @> array[(select auth.uid())]::uuid[]
  )
);

create policy "Direct messages are readable by participants" on public.direct_messages for select to authenticated
using ((select auth.uid()) = send_by or (select auth.uid()) = send_to);
create policy "Direct messages can be created by participants" on public.direct_messages for insert to authenticated
with check ((select auth.uid()) = send_by);

create policy "Notes are readable by everyone" on public.notes for select using (true);
create policy "Authenticated users can create notes" on public.notes for insert to authenticated with check (true);
create policy "Authenticated users can update notes" on public.notes for update to authenticated using (true) with check (true);
