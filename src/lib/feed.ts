import { createClient } from "@/lib/supabase/client";
import type { Comment, Post, Profile } from "@/lib/types";

export type FeedItem = {
  post: Post;
  author: Profile;
  liked: boolean;
  favoured: boolean;
  comments: Comment[];
};

export async function fetchCollegeFeed(opts: {
  collegeId: string;
  userId: string;
  classOnly?: boolean;
  classId?: string | null;
  sectionId?: string | null;
  studyOnly?: boolean;
  studyType?: string;
  subjectId?: string;
}): Promise<{ items: FeedItem[]; error?: string }> {
  const supabase = createClient();

  let query = supabase
    .from("posts")
    .select("*")
    .eq("college_id", opts.collegeId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (opts.classOnly && opts.classId) {
    query = query.eq("class_id", opts.classId);
  }
  if (opts.studyOnly) {
    query = query.eq("kind", "study");
    if (opts.studyType) query = query.eq("study_type", opts.studyType);
    if (opts.classId) query = query.eq("class_id", opts.classId);
    if (opts.sectionId) query = query.eq("section_id", opts.sectionId);
    if (opts.subjectId) query = query.eq("subject_id", opts.subjectId);
  }

  const { data: posts, error } = await query;
  if (error) return { items: [], error: error.message };
  const list = (posts as Post[]) || [];
  if (!list.length) return { items: [] };

  const authorIds = [...new Set(list.map((p) => p.author_id))];
  const postIds = list.map((p) => p.id);

  const [authorsRes, likesRes, favsRes, commentsRes] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", opts.userId)
      .in("post_id", postIds),
    supabase
      .from("favourites")
      .select("post_id")
      .eq("user_id", opts.userId)
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
  const favoured = new Set(
    ((favsRes.data as { post_id: string }[]) || []).map((f) => f.post_id)
  );
  const commentsByPost = new Map<string, Comment[]>();
  for (const c of (commentsRes.data as Comment[]) || []) {
    const arr = commentsByPost.get(c.post_id) || [];
    arr.push(c);
    commentsByPost.set(c.post_id, arr);
  }

  const items: FeedItem[] = [];
  for (const post of list) {
    const author = authors.get(post.author_id);
    if (!author) continue;
    items.push({
      post,
      author,
      liked: liked.has(post.id),
      favoured: favoured.has(post.id),
      comments: commentsByPost.get(post.id) || [],
    });
  }
  return { items };
}

export function notifyFeedUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("uu-feed-updated"));
  }
}
