"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Star,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, BadgeList } from "@/components/ui/Badge";
import { buildBadges } from "@/lib/badges";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoAddComment,
  demoToggleFavourite,
  demoToggleLike,
} from "@/lib/demo-store";
import type { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const catalog = useDemoCatalog();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");

  const author = catalog.profiles.find((p) => p.id === post.author_id);
  const liked = Boolean(
    user &&
      catalog.likes.some((l) => l.user_id === user.id && l.post_id === post.id)
  );
  const favoured = Boolean(
    user &&
      catalog.favourites.some(
        (f) => f.user_id === user.id && f.post_id === post.id
      )
  );
  const comments = catalog.comments.filter((c) => c.post_id === post.id);

  const badges = useMemo(() => {
    if (!author) return [];
    return buildBadges({
      profile: author,
      roles: catalog.roles,
      classes: catalog.classes,
      sections: catalog.sections,
      post,
      popularThreshold: catalog.popularThreshold,
    });
  }, [author, catalog, post]);

  if (!author) return null;

  return (
    <article className="card overflow-hidden">
      <header className="flex items-start gap-3 p-4">
        <Link href={`/profile/${author.username}`}>
          <Avatar name={author.display_name} url={author.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/profile/${author.username}`}
              className="font-semibold hover:underline"
            >
              {author.display_name}
            </Link>
            <BadgeList badges={badges} />
          </div>
          <p className="text-xs text-[var(--muted)]">
            @{author.username} ·{" "}
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            {post.kind === "study" && post.study_type
              ? ` · ${post.study_type}`
              : ""}
          </p>
        </div>
      </header>

      {post.caption && (
        <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-relaxed">
          {post.caption}
        </p>
      )}

      {post.media_type === "image" && (
        <div className="mx-4 mb-3 flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-[#1d2736] to-[#0f141c] text-[var(--muted)]">
          Campus photo placeholder
        </div>
      )}

      {post.media_type === "pdf" && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
          <FileText className="text-[var(--accent)]" />
          <div>
            <p className="font-medium">Study file / PDF</p>
            <p className="text-xs text-[var(--muted)]">
              Attachments upload when Supabase Storage is connected
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-[var(--line)] px-2 py-1">
        <button
          className={`btn btn-ghost border-0 ${liked ? "text-[var(--danger)]" : ""}`}
          onClick={() => user && demoToggleLike(user.id, post.id)}
          aria-label="Like"
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
          {post.like_count}
        </button>
        <button
          className="btn btn-ghost border-0"
          onClick={() => setShowComments((v) => !v)}
          aria-label="Comment"
        >
          <MessageCircle size={18} />
          {post.comment_count}
        </button>
        <button
          className="btn btn-ghost border-0"
          onClick={async () => {
            const url = `${window.location.origin}/home?post=${post.id}`;
            if (navigator.share) {
              try {
                await navigator.share({ title: "UU Community", url });
                return;
              } catch {
                /* fall through */
              }
            }
            await navigator.clipboard.writeText(url);
            alert("Link copied");
          }}
          aria-label="Share"
        >
          <Share2 size={18} />
        </button>
        <button
          className={`btn btn-ghost ml-auto border-0 ${favoured ? "text-[var(--accent)]" : ""}`}
          onClick={() => user && demoToggleFavourite(user.id, post.id)}
          aria-label="Favourite"
        >
          <Star size={18} fill={favoured ? "currentColor" : "none"} />
        </button>
      </div>

      {showComments && (
        <div className="space-y-3 border-t border-[var(--line)] px-4 py-3">
          {comments.map((c) => {
            const a = catalog.profiles.find((p) => p.id === c.author_id);
            return (
              <div key={c.id} className="text-sm">
                <span className="font-semibold">{a?.display_name ?? "User"}</span>{" "}
                <span className="text-[var(--muted)]">{c.body}</span>
              </div>
            );
          })}
          <form
            className="flex gap-2"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (!user || !comment.trim()) return;
              demoAddComment(user.id, post.id, comment.trim());
              setComment("");
            }}
          >
            <input
              className="input"
              placeholder="Add a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button className="btn btn-primary px-4" type="submit">
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
