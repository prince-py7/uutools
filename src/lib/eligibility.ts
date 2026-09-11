import type { Post, Profile } from "./types";
import { DEFAULT_POPULAR_THRESHOLD } from "./config";

/** Study resource passes Verified-only if official OR meets popularity threshold. */
export function isEligibleVerifiedOnly(
  post: Post,
  threshold: number = DEFAULT_POPULAR_THRESHOLD
): boolean {
  if (post.is_official_verified) return true;
  return post.kind === "study" && post.like_count >= threshold;
}

/** Green UNITIANS POPULAR only when popularity path (not official). */
export function isUnitiansPopular(
  post: Post,
  threshold: number = DEFAULT_POPULAR_THRESHOLD
): boolean {
  return (
    !post.is_official_verified &&
    post.kind === "study" &&
    post.like_count >= threshold
  );
}

/** Classmate-first, then college peers by recency. */
export function rankFeedPosts(posts: Post[], viewer: Profile | null): Post[] {
  return [...posts].sort((a, b) => {
    const aClass =
      viewer?.class_id && a.class_id === viewer.class_id ? 0 : 1;
    const bClass =
      viewer?.class_id && b.class_id === viewer.class_id ? 0 : 1;
    if (aClass !== bClass) return aClass - bClass;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
