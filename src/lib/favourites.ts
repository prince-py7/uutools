import { createClient } from "@/lib/supabase/client";
import type { Comment, Post, Profile } from "@/lib/types";

export type FavouriteFeedItem = {
  post: Post;
  author: Profile;
  liked: boolean;
  favoured: boolean;
  comments: Comment[];
};

export async function fetchMyFavourites(
  userId: string
): Promise<{ items: FavouriteFeedItem[]; error?: string }> {
  const supabase = createClient();
  const { data: favs, error } = await supabase
    .from("favourites")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { items: [], error: error.message };
  const postIds = ((favs as { post_id: string }[]) || []).map((f) => f.post_id);
  if (!postIds.length) return { items: [] };

  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select("*")
    .in("id", postIds);
  if (postsErr) return { items: [], error: postsErr.message };
  const list = (posts as Post[]) || [];
  if (!list.length) return { items: [] };

  const authorIds = [...new Set(list.map((p) => p.author_id))];
  const [authorsRes, likesRes, commentsRes] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
    supabase
      .from("comments")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
  ]);

  const authors = new Map(
    ((authorsRes.data as Profile[]) || []).map((p) => [p.id, p])
  );
  const liked = new Set(
    ((likesRes.data as { post_id: string }[]) || []).map((l) => l.post_id)
  );
  const commentsByPost = new Map<string, Comment[]>();
  for (const c of (commentsRes.data as Comment[]) || []) {
    const arr = commentsByPost.get(c.post_id) || [];
    arr.push(c);
    commentsByPost.set(c.post_id, arr);
  }

  const byId = new Map(list.map((p) => [p.id, p]));
  const items: FavouriteFeedItem[] = [];
  for (const id of postIds) {
    const post = byId.get(id);
    if (!post) continue;
    const author = authors.get(post.author_id);
    if (!author) continue;
    items.push({
      post,
      author,
      liked: liked.has(post.id),
      favoured: true,
      comments: commentsByPost.get(post.id) || [],
    });
  }
  return { items };
}
