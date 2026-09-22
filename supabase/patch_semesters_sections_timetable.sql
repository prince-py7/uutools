-- Sections per semester; subjects unique per class+semester;
-- Timetable templates (admin upload / student apply).
-- Safe to re-run.

-- ─── Sections → semester ─────────────────────────────────────────────────────

alter table public.sections
  add column if not exists semester_id uuid references public.semesters(id) on delete set null;

-- Backfill: attach orphan sections to the first semester of their class (if any)
update public.sections s
set semester_id = (
  select sm.id
  from public.semesters sm
  where sm.class_id = s.class_id
  order by sm.sort_order, sm.name
  limit 1
)
where s.semester_id is null;

create index if not exists sections_semester_id_idx on public.sections(semester_id);

alter table public.sections drop constraint if exists sections_class_id_name_key;
alter table public.sections drop constraint if exists sections_class_semester_name_key;
alter table public.sections
  add constraint sections_class_semester_name_key
  unique (class_id, semester_id, name);

-- ─── Subjects: same name OK across different semesters ───────────────────────

alter table public.subjects drop constraint if exists subjects_class_id_name_key;
alter table public.subjects drop constraint if exists subjects_class_semester_name_key;
-- Partial unique: when semester_id is set, name unique within class+semester
create unique index if not exists subjects_class_semester_name_uidx
  on public.subjects (class_id, semester_id, name)
  where semester_id is not null;
-- When semester_id is null, keep class+name unique
create unique index if not exists subjects_class_name_null_sem_uidx
  on public.subjects (class_id, name)
  where semester_id is null;

-- ─── Profiles: optional current semester ─────────────────────────────────────

alter table public.profiles
  add column if not exists semester_id uuid references public.semesters(id) on delete set null;

create index if not exists profiles_semester_id_idx on public.profiles(semester_id);

-- ─── Timetable templates ─────────────────────────────────────────────────────

create table if not exists public.timetable_templates (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, semester_id, section_id, name)
);

create table if not exists public.timetable_template_slots (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.timetable_templates(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 5),
  slot int not null check (slot between 1 and 7),
  subject_text text not null default '',
  unique (template_id, day_of_week, slot)
);

create index if not exists tt_templates_lookup_idx
  on public.timetable_templates (class_id, semester_id, section_id);

alter table public.timetable_templates enable row level security;
alter table public.timetable_template_slots enable row level security;

drop policy if exists tt_templates_read on public.timetable_templates;
create policy tt_templates_read on public.timetable_templates
  for select to authenticated using (true);

drop policy if exists tt_templates_admin on public.timetable_templates;
create policy tt_templates_admin on public.timetable_templates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists tt_template_slots_read on public.timetable_template_slots;
create policy tt_template_slots_read on public.timetable_template_slots
  for select to authenticated using (true);

drop policy if exists tt_template_slots_admin on public.timetable_template_slots;
create policy tt_template_slots_admin on public.timetable_template_slots
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
