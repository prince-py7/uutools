-- Fix: Could not find the 'media_name' column of 'posts' in the schema cache
-- Run in Supabase → SQL Editor, then wait ~10s (or reload API schema).
-- Safe to re-run.

alter table public.posts
  add column if not exists media_name text;

alter table public.posts
  add column if not exists study_unit text;

alter table public.posts
  add column if not exists academic_year text;

comment on column public.posts.media_name is
  'Original upload filename for study/PDF attachments';
