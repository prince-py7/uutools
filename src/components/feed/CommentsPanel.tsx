"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef } from "react";
import { Heart, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "@/components/ui/Badge";
import { buildCommentThreads } from "@/lib/comments";
import type { Comment, Profile } from "@/lib/types";

function CommentRow({
  comment,
  author,
  liked,
  nested,
  onReply,
  onToggleLike,
}: {
  comment: Comment;
  author: Profile | null;
  liked: boolean;
  nested?: boolean;
  onReply: (c: Comment, author: Profile | null) => void;
  onToggleLike: (commentId: string) => void;
}) {
  const username = author?.username || "user";
  const display =
    author?.display_name?.trim() || author?.username || "User";
  const when = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
  });
  const likes = comment.like_count || 0;

  return (
    <div className={`flex gap-2.5 ${nested ? "ml-9" : ""}`}>
      <Link
        href={`/profile/${username}`}
        className="mt-0.5 shrink-0"
        aria-label={`@${username}`}
      >
        <Avatar name={display} url={author?.avatar_url} size={nested ? 28 : 32} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <Link
            href={`/profile/${username}`}
            className="font-semibold hover:underline"
          >
            {username}
          </Link>{" "}
          <span className="whitespace-pre-wrap text-[var(--text)]">
            {comment.body}
          </span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
          <span>{when}</span>
          {likes > 0 ? (
            <span>
              {likes} like{likes === 1 ? "" : "s"}
            </span>
          ) : null}
          <button
            type="button"
            className="font-semibold hover:text-[var(--text)]"
            onClick={() => onReply(comment, author)}
          >
            Reply
          </button>
        </div>
      </div>
      <button
        type="button"
        className={`mt-1 shrink-0 p-1 ${
          liked ? "text-[var(--danger)]" : "text-[var(--muted)]"
        }`}
        aria-label={liked ? "Unlike comment" : "Like comment"}
        onClick={() => onToggleLike(comment.id)}
      >
        <Heart size={12} fill={liked ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

export function CommentsPanel({
  comments,
  people,
  likedCommentIds,
  currentUser,
  draft,
  setDraft,
  replyTo,
  setReplyTo,
  busy,
  loading,
  onSubmit,
  onToggleLike,
}: {
  comments: Comment[];
  people: Record<string, Profile>;
  likedCommentIds: Set<string>;
  currentUser: Profile | null;
  draft: string;
  setDraft: (v: string) => void;
  replyTo: { comment: Comment; author: Profile | null } | null;
  setReplyTo: (v: { comment: Comment; author: Profile | null } | null) => void;
  busy: boolean;
  loading?: boolean;
  onSubmit: (e: FormEvent) => void;
  onToggleLike: (commentId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const threads = useMemo(() => buildCommentThreads(comments), [comments]);

  function startReply(comment: Comment, author: Profile | null) {
    // Reply always attaches to the root of a thread (IG-style one level)
    const rootId = comment.parent_id || comment.id;
    const root =
      comments.find((c) => c.id === rootId) || comment;
    const rootAuthor = people[root.author_id] || author;
    setReplyTo({ comment: root, author: rootAuthor });
    queueMicrotask(() => inputRef.current?.focus());
  }

  return (
    <div className="space-y-3 border-t border-[var(--line)] px-4 py-3">
      {loading ? (
        <p className="text-xs text-[var(--muted)]">Loading comments…</p>
      ) : null}

      <div className="max-h-72 space-y-3.5 overflow-y-auto pr-1">
        {threads.length === 0 && !loading ? (
          <p className="text-sm text-[var(--muted)]">
            No comments yet. Say something…
          </p>
        ) : null}
        {threads.map(({ root, replies }) => {
          const rootAuthor = people[root.author_id] || null;
          return (
            <div key={root.id} className="space-y-3">
              <CommentRow
                comment={root}
                author={rootAuthor}
                liked={likedCommentIds.has(root.id)}
                onReply={startReply}
                onToggleLike={onToggleLike}
              />
              {replies.map((r) => (
                <CommentRow
                  key={r.id}
                  comment={r}
                  author={people[r.author_id] || null}
                  liked={likedCommentIds.has(r.id)}
                  nested
                  onReply={startReply}
                  onToggleLike={onToggleLike}
                />
              ))}
            </div>
          );
        })}
      </div>

      {replyTo ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-[#141414] px-3 py-1.5 text-xs text-[var(--muted)]">
          <span className="truncate">
            Replying to{" "}
            <span className="font-semibold text-[var(--text)]">
              @{replyTo.author?.username || "user"}
            </span>
          </span>
          <button
            type="button"
            className="shrink-0 p-0.5 hover:text-[var(--text)]"
            aria-label="Cancel reply"
            onClick={() => setReplyTo(null)}
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      <form className="flex items-center gap-2" onSubmit={onSubmit}>
        {currentUser ? (
          <Avatar
            name={currentUser.display_name}
            url={currentUser.avatar_url}
            size={28}
          />
        ) : null}
        <input
          ref={inputRef}
          className="input border-0 bg-transparent px-0"
          placeholder={
            replyTo
              ? `Reply to @${replyTo.author?.username || "user"}…`
              : "Add a comment…"
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          className="shrink-0 text-sm font-semibold text-[var(--accent)] disabled:opacity-40"
          type="submit"
          disabled={busy || !draft.trim()}
        >
          Post
        </button>
      </form>
    </div>
  );
}
