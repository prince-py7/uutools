-- Storage buckets for UNITIANS (run after schema.sql)

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('post-media', 'post-media', true),
  ('study-files', 'study-files', true),
  ('stories', 'stories', true)
on conflict (id) do nothing;

drop policy if exists "avatars upload own" on storage.objects;
create policy "avatars upload own"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
on storage.objects for select to public
using (bucket_id = 'avatars');

drop policy if exists "post-media upload own" on storage.objects;
create policy "post-media upload own"
on storage.objects for insert to authenticated
with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post-media public read" on storage.objects;
create policy "post-media public read"
on storage.objects for select to public
using (bucket_id = 'post-media');

drop policy if exists "study-files upload own" on storage.objects;
create policy "study-files upload own"
on storage.objects for insert to authenticated
with check (bucket_id = 'study-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "study-files public read" on storage.objects;
create policy "study-files public read"
on storage.objects for select to public
using (bucket_id = 'study-files');

drop policy if exists "stories upload own" on storage.objects;
create policy "stories upload own"
on storage.objects for insert to authenticated
with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "stories public read" on storage.objects;
create policy "stories public read"
on storage.objects for select to public
using (bucket_id = 'stories');
