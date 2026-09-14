import { createClient } from "@/lib/supabase/client";
import type { Comment, Post, Profile } from "@/lib/types";

export type FeedItem = {
  post: Post;
  author: Profile;
  liked: boolean;
  favoured: boolean;
  comments: Comment[];
  /** Comment + post authors keyed by profile id */
  people: Record<string, Profile>;
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

  const postIds = list.map((p) => p.id);

  const [likesRes, favsRes, commentsRes] = await Promise.all([
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

  const comments = (commentsRes.data as Comment[]) || [];
  const peopleIds = [
    ...new Set([
      ...list.map((p) => p.author_id),
      ...comments.map((c) => c.author_id),
    ]),
  ];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", peopleIds);

  const people: Record<string, Profile> = {};
  for (const p of (profiles as Profile[]) || []) people[p.id] = p;

  const liked = new Set(
    ((likesRes.data as { post_id: string }[]) || []).map((l) => l.post_id)
  );
  const favoured = new Set(
    ((favsRes.data as { post_id: string }[]) || []).map((f) => f.post_id)
  );
  const commentsByPost = new Map<string, Comment[]>();
  for (const c of comments) {
    const arr = commentsByPost.get(c.post_id) || [];
    arr.push(c);
    commentsByPost.set(c.post_id, arr);
  }

  const items: FeedItem[] = [];
  for (const post of list) {
    const author = people[post.author_id];
    if (!author) continue;
    items.push({
      post,
      author,
      liked: liked.has(post.id),
      favoured: favoured.has(post.id),
      comments: commentsByPost.get(post.id) || [],
      people,
    });
  }
  return { items };
}

export function notifyFeedUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("uu-feed-updated"));
  }
}
