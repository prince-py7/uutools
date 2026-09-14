-- Allow more class roles than CR / Professor, and optional custom role catalog.
-- Safe to re-run.

alter table public.class_roles drop constraint if exists class_roles_role_check;

alter table public.class_roles
  add constraint class_roles_role_check
  check (
    role in (
      'cr',
      'professor',
      'moderator',
      'coordinator',
      'assistant'
    )
    or role ~ '^[a-z][a-z0-9_]{1,30}$'
  );

create table if not exists public.role_definitions (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  role_key text not null check (role_key ~ '^[a-z][a-z0-9_]{1,30}$'),
  label text not null,
  created_at timestamptz not null default now(),
  unique (college_id, role_key)
);

alter table public.role_definitions enable row level security;

drop policy if exists role_definitions_read on public.role_definitions;
create policy role_definitions_read on public.role_definitions
  for select to authenticated using (true);

drop policy if exists role_definitions_admin on public.role_definitions;
create policy role_definitions_admin on public.role_definitions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Activate teacher_delegations by default when inserted from admin UI
-- (app sets is_active explicitly).
