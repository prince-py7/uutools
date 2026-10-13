-- Google / OAuth-friendly profile creation: unique usernames + optional avatar.
-- Safe to re-run after enabling Google in Supabase Auth → Providers.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  base text;
  n int := 0;
  pic text;
  dname text;
begin
  base := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  base := lower(regexp_replace(base, '[^a-z0-9._]', '', 'g'));
  if length(base) < 3 then
    base := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  if length(base) > 20 then
    base := substr(base, 1, 20);
  end if;

  uname := base;
  while exists (select 1 from public.profiles where lower(username) = uname) loop
    n := n + 1;
    uname := substr(base, 1, 20) || n::text;
    if n > 50 then
      uname := 'user' || substr(replace(new.id::text, '-', ''), 1, 10);
      exit;
    end if;
  end loop;

  pic := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );
  dname := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    uname
  );

  insert into public.profiles (id, username, email, email_verified, display_name, avatar_url)
  values (
    new.id,
    uname,
    lower(new.email),
    coalesce(new.email_confirmed_at is not null, false),
    dname,
    pic
  )
  on conflict (id) do update set
    email = excluded.email,
    email_verified = coalesce(new.email_confirmed_at is not null, excluded.email_verified),
    display_name = case
      when public.profiles.display_name is null
        or public.profiles.display_name = ''
      then excluded.display_name
      else public.profiles.display_name
    end,
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;
