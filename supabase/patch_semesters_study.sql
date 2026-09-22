-- Semesters under classes; subjects can belong to a semester.
-- Study posts gain semester / unit / academic year metadata.
-- Safe to re-run.

-- ─── Semesters ───────────────────────────────────────────────────────────────

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

alter table public.semesters enable row level security;

drop policy if exists semesters_read on public.semesters;
create policy semesters_read on public.semesters
  for select to authenticated using (true);

drop policy if exists semesters_admin on public.semesters;
create policy semesters_admin on public.semesters
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Subjects → optional semester ────────────────────────────────────────────

alter table public.subjects
  add column if not exists semester_id uuid references public.semesters(id) on delete set null;

create index if not exists subjects_semester_id_idx on public.subjects(semester_id);

-- ─── Posts study metadata ────────────────────────────────────────────────────

alter table public.posts
  add column if not exists semester_id uuid references public.semesters(id) on delete set null;

alter table public.posts
  add column if not exists study_unit text;

alter table public.posts
  add column if not exists academic_year text;

alter table public.posts
  add column if not exists media_name text;

create index if not exists posts_semester_id_idx on public.posts(semester_id);
create index if not exists posts_academic_year_idx on public.posts(academic_year);

-- ─── Notifications: friend_request type ──────────────────────────────────────

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('class_announcement', 'system', 'friend_request', 'friend_accepted'));
