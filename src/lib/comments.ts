import type { Comment } from "@/lib/types";

export type CommentThread = {
  root: Comment;
  replies: Comment[];
};

/** Group flat comments into Instagram-style threads (root + replies). */
export function buildCommentThreads(comments: Comment[]): CommentThread[] {
  const roots: Comment[] = [];
  const byParent = new Map<string, Comment[]>();

  for (const c of comments) {
    const parent = c.parent_id || null;
    if (!parent) {
      roots.push(c);
      continue;
    }
    const arr = byParent.get(parent) || [];
    arr.push(c);
    byParent.set(parent, arr);
  }

  // Orphan replies (parent missing) show as roots so nothing is lost
  for (const [parentId, replies] of byParent) {
    if (!comments.some((c) => c.id === parentId)) {
      roots.push(...replies);
      byParent.delete(parentId);
    }
  }

  roots.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return roots.map((root) => ({
    root,
    replies: (byParent.get(root.id) || []).sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }));
}
