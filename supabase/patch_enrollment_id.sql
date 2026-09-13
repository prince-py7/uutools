-- Add student College ID / enrollment number to profiles.
-- Safe to re-run.

alter table public.profiles
  add column if not exists enrollment_id text;
