-- Create servers table
create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Create server_members table (referencing public.profiles to establish foreign key relation)
create table if not exists public.server_members (
  server_id uuid not null references public.servers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'moderator', 'normal')) default 'normal',
  created_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

-- Create channels table
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  name text not null,
  description text not null default '',
  allowed_roles text[] not null default '{"admin", "moderator", "normal"}',
  created_at timestamptz not null default now()
);

-- Create server_messages table
create table if not exists public.server_messages (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  send_by uuid not null references auth.users (id) on delete cascade,
  sender_name text not null,
  text text not null default '',
  type text not null default 'text',
  shared_post jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists server_members_user_idx on public.server_members (user_id);
create index if not exists channels_server_idx on public.channels (server_id);
create index if not exists server_messages_channel_created_idx on public.server_messages (channel_id, created_at desc);

-- Automatic member/channel setup on server creation
create or replace function public.handle_new_server()
returns trigger as $$
begin
  -- Add creator as admin
  insert into public.server_members (server_id, user_id, role)
  values (new.id, new.owner_id, 'admin');

  -- Create general channel
  insert into public.channels (server_id, name, allowed_roles)
  values (new.id, 'general', array['admin', 'moderator', 'normal']);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_server_created on public.servers;
create trigger on_server_created
  after insert on public.servers
  for each row execute function public.handle_new_server();

-- Enable Row Level Security (RLS)
alter table public.servers enable row level security;
alter table public.server_members enable row level security;
alter table public.channels enable row level security;
alter table public.server_messages enable row level security;

-- Enable replica identities to FULL for realtime
alter table public.servers replica identity full;
alter table public.server_members replica identity full;
alter table public.channels replica identity full;
alter table public.server_messages replica identity full;

-- RLS Policies

-- servers
drop policy if exists "Servers are readable by authenticated users" on public.servers;
create policy "Servers are readable by authenticated users" on public.servers for select to authenticated using (true);

drop policy if exists "Authenticated users can create servers" on public.servers;
create policy "Authenticated users can create servers" on public.servers for insert to authenticated with check (true);

drop policy if exists "Admins can update servers" on public.servers;
create policy "Admins can update servers" on public.servers for update to authenticated
using (exists (select 1 from public.server_members m where m.server_id = id and m.user_id = auth.uid() and m.role = 'admin'));

drop policy if exists "Admins can delete servers" on public.servers;
create policy "Admins can delete servers" on public.servers for delete to authenticated
using (exists (select 1 from public.server_members m where m.server_id = id and m.user_id = auth.uid() and m.role = 'admin'));

-- server_members (using a flat True policy for read to prevent infinite recursion, safe for community servers)
drop policy if exists "Members can view server members" on public.server_members;
create policy "Members can view server members" on public.server_members for select to authenticated using (true);

drop policy if exists "Users can join servers" on public.server_members;
create policy "Users can join servers" on public.server_members for insert to authenticated
with check (auth.uid() = user_id and role = 'normal');

drop policy if exists "Admins can update member roles" on public.server_members;
create policy "Admins can update member roles" on public.server_members for update to authenticated
using (exists (select 1 from public.server_members m where m.server_id = server_id and m.user_id = auth.uid() and m.role = 'admin'));

drop policy if exists "Members can leave, admins/mods can kick" on public.server_members;
create policy "Members can leave, admins/mods can kick" on public.server_members for delete to authenticated
using (
  auth.uid() = user_id 
  or exists (
    select 1 from public.server_members m 
    where m.server_id = server_id and m.user_id = auth.uid() and m.role in ('admin', 'moderator')
  )
);

-- channels
drop policy if exists "Members with correct roles can read channels" on public.channels;
create policy "Members with correct roles can read channels" on public.channels for select to authenticated
using (
  exists (
    select 1 from public.server_members m
    where m.server_id = server_id
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  )
);

drop policy if exists "Admins and mods can create channels" on public.channels;
create policy "Admins and mods can create channels" on public.channels for insert to authenticated
with check (
  exists (
    select 1 from public.server_members m
    where m.server_id = server_id
      and m.user_id = auth.uid()
      and m.role in ('admin', 'moderator')
  )
);

drop policy if exists "Admins and mods can update channels" on public.channels;
create policy "Admins and mods can update channels" on public.channels for update to authenticated
using (
  exists (
    select 1 from public.server_members m
    where m.server_id = server_id
      and m.user_id = auth.uid()
      and m.role in ('admin', 'moderator')
  )
);

drop policy if exists "Admins and mods can delete channels" on public.channels;
create policy "Admins and mods can delete channels" on public.channels for delete to authenticated
using (
  exists (
    select 1 from public.server_members m
    where m.server_id = server_id
      and m.user_id = auth.uid()
      and m.role in ('admin', 'moderator')
  )
);

-- server_messages
drop policy if exists "Users can read channel messages" on public.server_messages;
create policy "Users can read channel messages" on public.server_messages for select to authenticated
using (
  exists (
    select 1 from public.channels c
    join public.server_members m on m.server_id = c.server_id
    where c.id = channel_id
      and m.user_id = auth.uid()
      and m.role = any(c.allowed_roles)
  )
);

drop policy if exists "Users can send channel messages" on public.server_messages;
create policy "Users can send channel messages" on public.server_messages for insert to authenticated
with check (
  exists (
    select 1 from public.channels c
    join public.server_members m on m.server_id = c.server_id
    where c.id = channel_id
      and m.user_id = auth.uid()
      and m.role = any(c.allowed_roles)
  )
  and auth.uid() = send_by
);

drop policy if exists "Senders and staff can delete messages" on public.server_messages;
create policy "Senders and staff can delete messages" on public.server_messages for delete to authenticated
using (
  auth.uid() = send_by
  or exists (
    select 1 from public.server_members m
    where m.server_id = server_id
      and m.user_id = auth.uid()
      and m.role in ('admin', 'moderator')
  )
);

-- Enable real-time replication for servers, members, channels, and messages
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'servers') then
      execute 'alter publication supabase_realtime add table public.servers';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'server_members') then
      execute 'alter publication supabase_realtime add table public.server_members';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'channels') then
      execute 'alter publication supabase_realtime add table public.channels';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'server_messages') then
      execute 'alter publication supabase_realtime add table public.server_messages';
    end if;
  end if;
end $$;
