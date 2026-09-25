-- Fix: "Could not find the 'media_name' column of 'posts' in the schema cache"
-- Run in Supabase → SQL Editor.
-- Then wait ~10s, or open Project Settings → API → "Reload schema" if available.
-- Safe to re-run.

alter table public.posts
  add column if not exists media_name text;

comment on column public.posts.media_name is
  'Original upload filename for study/PDF attachments';
