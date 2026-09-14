-- Chat media + read receipts for DMs
-- Run in Supabase SQL Editor after schema.sql / storage.sql

alter table public.messages
  add column if not exists media_url text;

alter table public.messages
  add column if not exists media_type text
  check (media_type is null or media_type in ('image', 'audio'));

alter table public.messages
  add column if not exists read_at timestamptz;

-- Allow empty body when media is present
do $$
begin
  alter table public.messages drop constraint if exists messages_body_check;
exception when undefined_object then null;
end $$;

alter table public.messages alter column body set default '';

create index if not exists messages_unread_idx
  on public.messages (conversation_id, sender_id)
  where read_at is null;
