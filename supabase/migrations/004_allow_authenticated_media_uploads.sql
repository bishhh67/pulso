insert into storage.buckets (id, name, public)
values ('pulchowkapp-media', 'pulchowkapp-media', true)
on conflict (id) do update
  set public = excluded.public;

drop policy if exists "Authenticated users can upload media" on storage.objects;
create policy "Authenticated users can upload media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'pulchowkapp-media');

drop policy if exists "Authenticated users can update media" on storage.objects;
create policy "Authenticated users can update media"
on storage.objects
for update
to authenticated
using (bucket_id = 'pulchowkapp-media')
with check (bucket_id = 'pulchowkapp-media');

drop policy if exists "Authenticated users can delete media" on storage.objects;
create policy "Authenticated users can delete media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'pulchowkapp-media');
