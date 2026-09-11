-- Run this NOW in Supabase SQL Editor if onboarding loops / class dropdown empty.
-- Safe to re-run (uses on conflict).

insert into public.colleges (name, slug, is_active)
values ('United University', 'united-university', true)
on conflict (slug) do nothing;

do $$
declare
  uu_id uuid;
  bca_id uuid;
  btech_id uuid;
begin
  select id into uu_id from public.colleges where slug = 'united-university';
  if uu_id is null then
    raise exception 'United University college missing — run schema.sql first';
  end if;

  insert into public.classes (college_id, name)
  values (uu_id, 'BCA')
  on conflict (college_id, name) do nothing;

  insert into public.classes (college_id, name)
  values (uu_id, 'BTech')
  on conflict (college_id, name) do nothing;

  select id into bca_id from public.classes where college_id = uu_id and name = 'BCA';
  select id into btech_id from public.classes where college_id = uu_id and name = 'BTech';

  insert into public.sections (class_id, name) values
    (bca_id, 'A'),
    (bca_id, 'B'),
    (btech_id, 'CSE')
  on conflict (class_id, name) do nothing;

  insert into public.subjects (class_id, name) values
    (bca_id, 'DBMS'),
    (bca_id, 'Operating Systems'),
    (bca_id, 'Mathematics')
  on conflict (class_id, name) do nothing;
end $$;
