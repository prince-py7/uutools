-- UU Community schema (run in Supabase SQL editor)
-- Free-tier friendly: Postgres + RLS + Storage buckets created separately

create extension if not exists "pgcrypto";

-- Colleges
create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Classes (e.g. BCA) scoped to college
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (college_id, name)
);

-- Sections (e.g. A, B)
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

-- Subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  college_id uuid references public.colleges(id),
  class_id uuid references public.classes(id),
  section_id uuid references public.sections(id),
  socials jsonb not null default '{}'::jsonb,
  is_admin boolean not null default false,
  is_disabled boolean not null default false,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  role text not null check (role in ('cr', 'professor')),
  created_at timestamptz not null default now(),
  unique (user_id, class_id, role)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  section_id uuid references public.sections(id) on delete set null,
  kind text not null check (kind in ('social', 'study')),
  study_type text check (study_type in ('unit', 'assignment', 'practical', 'whiteboard', 'other') or study_type is null),
  subject_id uuid references public.subjects(id) on delete set null,
  caption text not null default '',
  media_url text,
  media_type text check (media_type in ('image', 'pdf', 'none') or media_type is null),
  like_count int not null default 0,
  comment_count int not null default 0,
  is_official_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists posts_college_created_idx on public.posts (college_id, created_at desc);
create index if not exists posts_class_created_idx on public.posts (class_id, created_at desc);
create index if not exists posts_kind_idx on public.posts (kind);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.favourites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.timetables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 5), -- Mon=1 .. Fri=5
  slot int not null check (slot between 1 and 7),
  subject_text text not null default '',
  unique (user_id, day_of_week, slot)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- Seed United University
insert into public.colleges (name, slug, is_active)
values ('United University', 'united-university', true)
on conflict (slug) do nothing;

insert into public.app_settings (key, value)
values ('popular_like_threshold', '10'::jsonb)
on conflict (key) do nothing;

-- Helper: is current user admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Auto profile stub on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    uname || '-' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(new.raw_user_meta_data->>'full_name', uname)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep like_count in sync
create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_sync on public.likes;
create trigger likes_sync
  after insert or delete on public.likes
  for each row execute function public.sync_like_count();

create or replace function public.sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_sync on public.comments;
create trigger comments_sync
  after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

-- RLS
alter table public.colleges enable row level security;
alter table public.classes enable row level security;
alter table public.sections enable row level security;
alter table public.subjects enable row level security;
alter table public.profiles enable row level security;
alter table public.class_roles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.favourites enable row level security;
alter table public.timetables enable row level security;
alter table public.app_settings enable row level security;
alter table public.reports enable row level security;

-- Colleges readable by all authenticated; write admin
create policy colleges_read on public.colleges for select to authenticated using (true);
create policy colleges_admin on public.colleges for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy classes_read on public.classes for select to authenticated using (true);
create policy classes_admin on public.classes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy sections_read on public.sections for select to authenticated using (true);
create policy sections_admin on public.sections for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy subjects_read on public.subjects for select to authenticated using (true);
create policy subjects_admin on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy profiles_read on public.profiles for select to authenticated using (not is_disabled or id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid() or public.is_admin());

create policy roles_read on public.class_roles for select to authenticated using (true);
create policy roles_admin on public.class_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy posts_read on public.posts for select to authenticated using (true);
create policy posts_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_update_own on public.posts for update to authenticated using (author_id = auth.uid() or public.is_admin());
create policy posts_delete_own on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy likes_read on public.likes for select to authenticated using (true);
create policy likes_write on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete on public.likes for delete to authenticated using (user_id = auth.uid());

create policy comments_read on public.comments for select to authenticated using (true);
create policy comments_write on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy fav_all on public.favourites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tt_all on public.timetables for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy settings_read on public.app_settings for select to authenticated using (true);
create policy settings_admin on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_admin on public.reports for select to authenticated using (public.is_admin());

-- Storage buckets (run in dashboard or via API):
-- avatars, post-media, study-files (public read, authenticated write to own folder)
