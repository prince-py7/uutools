-- Run in Supabase SQL editor if profiles show 0 posts for your own posts.
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select to authenticated
  using (author_id = auth.uid() or public.same_college(college_id));
