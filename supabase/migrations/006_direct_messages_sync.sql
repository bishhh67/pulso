-- Enable delete policy for direct_messages
drop policy if exists "Direct messages can be deleted by sender" on public.direct_messages;
create policy "Direct messages can be deleted by sender" on public.direct_messages for delete to authenticated
using ((select auth.uid()) = send_by);

-- Set replica identity to full so that DELETE events carry the full old row data (like chat_id)
alter table public.direct_messages replica identity full;

-- Enable real-time replication for direct_messages
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'direct_messages'
     ) then
    execute 'alter publication supabase_realtime add table public.direct_messages';
  end if;
end $$;
