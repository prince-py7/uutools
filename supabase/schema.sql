-- UNITIANS / UU Community schema
-- Run in Supabase SQL editor (Free tier). Storage buckets created separately (see docs/SETUP.md).
-- Email auth only — do NOT enable Google/OAuth providers.

create extension if not exists "pgcrypto";

-- ─── Directory ───────────────────────────────────────────────────────────────

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (college_id, name)
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

-- ─── Profiles & roles ────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null unique,
  email_verified boolean not null default false,
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
  last_verification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9._]{3,24}$')
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

-- Future: teacher_delegations (modeled, not granted by app yet)
create table if not exists public.teacher_delegations (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid not null references public.profiles(id) on delete cascade,
  can_manage_subjects boolean not null default false,
  can_post_official boolean not null default true,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Feed ────────────────────────────────────────────────────────────────────

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  section_id uuid references public.sections(id) on delete set null,
  kind text not null check (kind in ('social', 'study')),
  study_type text check (
    study_type in ('unit', 'assignment', 'practical', 'whiteboard', 'other')
    or study_type is null
  ),
  subject_id uuid references public.subjects(id) on delete set null,
  caption text not null default '',
  media_url text,
  media_type text check (
    media_type in ('image', 'pdf', 'video', 'none') or media_type is null
  ),
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
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

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.timetables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 5),
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

-- ─── Phase 2: stories, friends, DMs ──────────────────────────────────────────

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists stories_class_expires_idx
  on public.stories (class_id, expires_at desc);
create index if not exists stories_expires_idx on public.stories (expires_at);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- ─── Seed ────────────────────────────────────────────────────────────────────

insert into public.colleges (name, slug, is_active)
values ('United University', 'united-university', true)
on conflict (slug) do nothing;

insert into public.app_settings (key, value)
values
  ('popular_like_threshold', '10'::jsonb),
  ('free_tier_notice', '"Supabase Free + Vercel Hobby: projects pause after inactivity; storage & bandwidth are limited. Non-commercial pilot only."'::jsonb)
on conflict (key) do nothing;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_college_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select college_id from public.profiles where id = auth.uid();
$$;

create or replace function public.same_college(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or (target is not null and target = public.my_college_id());
$$;

create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv_id
      and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  );
$$;

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
  uname := lower(regexp_replace(uname, '[^a-z0-9._]', '', 'g'));
  if length(uname) < 3 then
    uname := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into public.profiles (id, username, email, email_verified, display_name)
  values (
    new.id,
    uname,
    lower(new.email),
    coalesce(new.email_confirmed_at is not null, false),
    coalesce(new.raw_user_meta_data->>'full_name', uname)
  )
  on conflict (id) do update set
    email = excluded.email,
    email_verified = coalesce(new.email_confirmed_at is not null, false);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

create or replace function public.sync_share_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set share_count = share_count + 1 where id = new.post_id;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists shares_sync on public.shares;
create trigger shares_sync
  after insert on public.shares
  for each row execute function public.sync_share_count();

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

create or replace function public.email_for_username(uname text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.profiles where lower(username) = lower(uname) limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

create or replace function public.sync_email_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email_verified = (new.email_confirmed_at is not null),
      email = lower(new.email),
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at, email on auth.users
  for each row execute function public.sync_email_verified();

-- Auto-set story expiry to 24h if not provided
create or replace function public.set_story_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.expires_at is null then
    new.expires_at := new.created_at + interval '24 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists stories_set_expiry on public.stories;
create trigger stories_set_expiry
  before insert on public.stories
  for each row execute function public.set_story_expiry();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.colleges enable row level security;
alter table public.classes enable row level security;
alter table public.sections enable row level security;
alter table public.subjects enable row level security;
alter table public.profiles enable row level security;
alter table public.class_roles enable row level security;
alter table public.teacher_delegations enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.favourites enable row level security;
alter table public.shares enable row level security;
alter table public.timetables enable row level security;
alter table public.app_settings enable row level security;
alter table public.reports enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.friend_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Drop legacy open policies if re-running
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Colleges: any authenticated can list active (onboarding); admin write
create policy colleges_read on public.colleges for select to authenticated
  using (is_active or public.is_admin());
create policy colleges_admin on public.colleges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Classes/sections/subjects: same college or admin
create policy classes_read on public.classes for select to authenticated
  using (public.same_college(college_id) or college_id is not null);
-- Onboarding needs to see classes for chosen college before profile.college_id is set:
-- allow read of all classes for active colleges; writes admin-only
drop policy if exists classes_read on public.classes;
create policy classes_read on public.classes for select to authenticated using (true);
create policy classes_admin on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sections_read on public.sections for select to authenticated using (true);
create policy sections_admin on public.sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy subjects_read on public.subjects for select to authenticated using (true);
create policy subjects_admin on public.subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profiles: own always; peers only same college; admin all
create policy profiles_read on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (
      not is_disabled
      and college_id is not null
      and college_id = public.my_college_id()
    )
  );
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.is_admin());

create policy roles_read on public.class_roles for select to authenticated using (true);
create policy roles_admin on public.class_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy teacher_delegations_admin on public.teacher_delegations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy teacher_delegations_read_own on public.teacher_delegations for select to authenticated
  using (teacher_id = auth.uid() or public.is_admin());

-- Posts: college-scoped
create policy posts_read on public.posts for select to authenticated
  using (public.same_college(college_id));
create policy posts_insert on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and college_id = public.my_college_id()
  );
create policy posts_update_own on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy posts_delete_own on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy likes_read on public.likes for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.same_college(p.college_id)
    )
  );
create policy likes_write on public.likes for insert to authenticated
  with check (user_id = auth.uid());
create policy likes_delete on public.likes for delete to authenticated
  using (user_id = auth.uid());

create policy comments_read on public.comments for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.same_college(p.college_id)
    )
  );
create policy comments_write on public.comments for insert to authenticated
  with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy fav_all on public.favourites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy shares_insert on public.shares for insert to authenticated
  with check (user_id = auth.uid());
create policy shares_read on public.shares for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.same_college(p.college_id)
    )
  );

create policy tt_all on public.timetables for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy settings_read on public.app_settings for select to authenticated using (true);
create policy settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy reports_admin on public.reports for select to authenticated
  using (public.is_admin());

-- Stories: same college, not expired (or author/admin)
create policy stories_read on public.stories for select to authenticated
  using (
    public.same_college(college_id)
    and (expires_at > now() or author_id = auth.uid() or public.is_admin())
  );
create policy stories_insert on public.stories for insert to authenticated
  with check (
    author_id = auth.uid()
    and college_id = public.my_college_id()
  );
create policy stories_delete on public.stories for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy story_views_read on public.story_views for select to authenticated
  using (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );
create policy story_views_write on public.story_views for insert to authenticated
  with check (viewer_id = auth.uid());

-- Friend requests: participants only; must be same college
create policy friend_requests_read on public.friend_requests for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());
create policy friend_requests_insert on public.friend_requests for insert to authenticated
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1 from public.profiles a, public.profiles b
      where a.id = from_user_id and b.id = to_user_id
        and a.college_id is not null and a.college_id = b.college_id
    )
  );
create policy friend_requests_update on public.friend_requests for update to authenticated
  using (to_user_id = auth.uid() or from_user_id = auth.uid() or public.is_admin());

-- Conversations & messages: members only
create policy conversations_read on public.conversations for select to authenticated
  using (user_a_id = auth.uid() or user_b_id = auth.uid() or public.is_admin());
create policy conversations_insert on public.conversations for insert to authenticated
  with check (user_a_id = auth.uid() or user_b_id = auth.uid());

create policy messages_read on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id) or public.is_admin());
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

-- Storage buckets (create in dashboard): avatars, post-media, study-files, stories
-- MIME allow: image/jpeg, image/png, image/webp, image/gif, application/pdf, video/mp4, video/webm
-- Study files max 10 MB (enforce in client + storage policies)
