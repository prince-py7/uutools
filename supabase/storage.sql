-- Storage buckets for UNITIANS (run after schema.sql)
-- Re-runnable: drops/recreates policies safely.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/jpeg','image/png','image/webp','image/gif']
  ),
  (
    'post-media',
    'post-media',
    true,
    15728640,
    array[
      'image/jpeg','image/png','image/webp','image/gif',
      'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav','audio/aac'
    ]
  ),
  (
    'study-files',
    'study-files',
    true,
    10485760,
    array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
  ),
  (
    'stories',
    'stories',
    true,
    26214400,
    array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Clear overly-strict mime lists if a previous dashboard setting blocked audio/images
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif',
  'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav','audio/aac'
]
where id = 'post-media';

-- ── avatars ──────────────────────────────────────────────────────────────────
drop policy if exists "avatars upload own" on storage.objects;
create policy "avatars upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
on storage.objects for select to public
using (bucket_id = 'avatars');

-- ── post-media (posts + chat images/voice) ───────────────────────────────────
drop policy if exists "post-media upload own" on storage.objects;
create policy "post-media upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "post-media update own" on storage.objects;
create policy "post-media update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "post-media delete own" on storage.objects;
create policy "post-media delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "post-media public read" on storage.objects;
create policy "post-media public read"
on storage.objects for select to public
using (bucket_id = 'post-media');

-- ── study-files ──────────────────────────────────────────────────────────────
drop policy if exists "study-files upload own" on storage.objects;
create policy "study-files upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "study-files update own" on storage.objects;
create policy "study-files update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'study-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "study-files public read" on storage.objects;
create policy "study-files public read"
on storage.objects for select to public
using (bucket_id = 'study-files');

-- ── stories ──────────────────────────────────────────────────────────────────
drop policy if exists "stories upload own" on storage.objects;
create policy "stories upload own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "stories update own" on storage.objects;
create policy "stories update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "stories public read" on storage.objects;
create policy "stories public read"
on storage.objects for select to public
using (bucket_id = 'stories');
