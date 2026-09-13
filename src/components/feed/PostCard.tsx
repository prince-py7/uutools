"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Star,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, BadgeList } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { buildBadges } from "@/lib/badges";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoAddComment,
  demoRecordShare,
  demoToggleFavourite,
  demoToggleLike,
} from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/client";
import type { Comment, Post, Profile } from "@/lib/types";

export function PostCard({
  post: initialPost,
  author: authorOverride,
  initialLiked,
  initialFavoured,
  initialComments,
}: {
  post: Post;
  author?: Profile | null;
  initialLiked?: boolean;
  initialFavoured?: boolean;
  initialComments?: Comment[];
}) {
  const { user, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [favoured, setFavoured] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    if (demoMode) {
      setLiked(
        Boolean(
          user &&
            catalog.likes.some(
              (l) => l.user_id === user.id && l.post_id === post.id
            )
        )
      );
      setFavoured(
        Boolean(
          user &&
            catalog.favourites.some(
              (f) => f.user_id === user.id && f.post_id === post.id
            )
        )
      );
      setComments(catalog.comments.filter((c) => c.post_id === post.id));
      return;
    }
    setLiked(Boolean(initialLiked));
    setFavoured(Boolean(initialFavoured));
    setComments(initialComments || []);
  }, [
    demoMode,
    user,
    catalog.likes,
    catalog.favourites,
    catalog.comments,
    post.id,
    initialLiked,
    initialFavoured,
    initialComments,
  ]);

  const author =
    authorOverride ??
    catalog.profiles.find((p) => p.id === post.author_id) ??
    null;

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

  async function toggleLike() {
    if (!user || busy) return;
    if (demoMode) {
      demoToggleLike(user.id, post.id);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const next = !liked;
    setLiked(next);
    setPost((p) => ({
      ...p,
      like_count: Math.max(0, p.like_count + (next ? 1 : -1)),
    }));
    const { error } = next
      ? await supabase.from("likes").insert({ user_id: user.id, post_id: post.id })
      : await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
    if (error) {
      setLiked(!next);
      setPost((p) => ({
        ...p,
        like_count: Math.max(0, p.like_count + (next ? -1 : 1)),
      }));
      toast.error(error.message);
    }
    setBusy(false);
  }

  async function toggleFavourite() {
    if (!user || busy) return;
    if (demoMode) {
      demoToggleFavourite(user.id, post.id);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const next = !favoured;
    setFavoured(next);
    const { error } = next
      ? await supabase
          .from("favourites")
          .insert({ user_id: user.id, post_id: post.id })
      : await supabase
          .from("favourites")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", post.id);
    if (error) {
      setFavoured(!next);
      toast.error(error.message);
    }
    setBusy(false);
  }

  async function sharePost() {
    const url = `${window.location.origin}/home?post=${post.id}`;
    if (user) {
      if (demoMode) {
        demoRecordShare(user.id, post.id);
      } else {
        const supabase = createClient();
        await supabase.from("shares").insert({
          user_id: user.id,
          post_id: post.id,
        });
        setPost((p) => ({ ...p, share_count: p.share_count + 1 }));
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: "UNITIANS", url });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!user || !comment.trim() || busy) return;
    const body = comment.trim();
    if (demoMode) {
      demoAddComment(user.id, post.id, body);
      setComment("");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: post.id,
        author_id: user.id,
        body,
      })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    setComments((prev) => [...prev, data as Comment]);
    setPost((p) => ({ ...p, comment_count: p.comment_count + 1 }));
    setComment("");
    setBusy(false);
  }

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

      {post.media_type === "image" && post.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt=""
          className="mb-3 max-h-[520px] w-full object-cover"
        />
      )}

      {post.media_type === "image" && !post.media_url && (
        <div className="mx-4 mb-3 flex aspect-square items-center justify-center rounded-xl bg-[#1a1a1a] text-[var(--muted)]">
          Photo
        </div>
      )}

      {post.media_type === "video" && post.media_url && (
        <video
          src={post.media_url}
          controls
          className="mb-3 max-h-[520px] w-full bg-black"
        />
      )}

      {post.media_type === "pdf" && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[#1a1a1a] p-4">
          <FileText className="text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Study file / PDF</p>
            {post.media_url ? (
              <a
                href={post.media_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--accent)]"
              >
                Open attachment
              </a>
            ) : (
              <p className="text-xs text-[var(--muted)]">No file attached</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-[var(--line)] px-2 py-1">
        <button
          className={`btn btn-ghost border-0 ${liked ? "text-[var(--danger)]" : ""}`}
          onClick={() => void toggleLike()}
          aria-label="Like"
          disabled={busy}
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
          onClick={() => void sharePost()}
          aria-label="Share"
        >
          <Share2 size={18} />
          {post.share_count > 0 ? post.share_count : null}
        </button>
        <button
          className={`btn btn-ghost ml-auto border-0 ${favoured ? "text-[var(--accent)]" : ""}`}
          onClick={() => void toggleFavourite()}
          aria-label="Favourite"
          disabled={busy}
        >
          <Star size={18} fill={favoured ? "currentColor" : "none"} />
        </button>
      </div>

      {showComments && (
        <div className="space-y-3 border-t border-[var(--line)] px-4 py-3">
          {comments.map((c) => {
            const a =
              c.author_id === author.id
                ? author
                : catalog.profiles.find((p) => p.id === c.author_id);
            return (
              <div key={c.id} className="text-sm">
                <span className="font-semibold">
                  {a?.display_name ?? (c.author_id === user?.id ? "You" : "User")}
                </span>{" "}
                <span className="text-[var(--muted)]">{c.body}</span>
              </div>
            );
          })}
          <form className="flex gap-2" onSubmit={(e) => void submitComment(e)}>
            <input
              className="input"
              placeholder="Add a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button className="btn btn-primary px-4" type="submit" disabled={busy}>
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
