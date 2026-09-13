-- Class announcements + in-app notifications + Web Push subscriptions
-- Run in Supabase SQL Editor after schema.sql

create table if not exists public.class_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('class_announcement', 'system')),
  title text not null default '',
  body text not null default '',
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.class_announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- Announcements: class members can read; CR/professor/admin can insert
create policy announcements_read on public.class_announcements
  for select to authenticated using (true);

create policy announcements_insert on public.class_announcements
  for insert to authenticated with check (
    author_id = auth.uid()
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin = true
      )
      or exists (
        select 1 from public.class_roles r
        where r.user_id = auth.uid()
          and r.class_id = class_announcements.class_id
          and r.role in ('cr', 'professor')
      )
    )
  );

-- Notifications: own rows only
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid());

create policy notifications_insert_authenticated on public.notifications
  for insert to authenticated with check (true);

-- Push subscriptions: own rows
create policy push_select_own on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy push_insert_own on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

create policy push_delete_own on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

create policy push_update_own on public.push_subscriptions
  for update to authenticated using (user_id = auth.uid());
