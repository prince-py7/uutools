-- Instagram-style comments: replies + likes.
-- Safe to re-run in Supabase SQL Editor.

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

alter table public.comments
  add column if not exists like_count int not null default 0;

create index if not exists comments_post_id_created_idx
  on public.comments (post_id, created_at);

create index if not exists comments_parent_id_idx
  on public.comments (parent_id);

create table if not exists public.comment_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index if not exists comment_likes_comment_id_idx
  on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

drop policy if exists comment_likes_read on public.comment_likes;
create policy comment_likes_read on public.comment_likes
  for select to authenticated
  using (
    exists (
      select 1
      from public.comments c
      join public.posts p on p.id = c.post_id
      where c.id = comment_id and public.same_college(p.college_id)
    )
  );

drop policy if exists comment_likes_write on public.comment_likes;
create policy comment_likes_write on public.comment_likes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists comment_likes_delete on public.comment_likes;
create policy comment_likes_delete on public.comment_likes
  for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.sync_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments
    set like_count = like_count + 1
    where id = new.comment_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.comments
    set like_count = greatest(like_count - 1, 0)
    where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_sync on public.comment_likes;
create trigger comment_likes_sync
  after insert or delete on public.comment_likes
  for each row execute function public.sync_comment_like_count();
