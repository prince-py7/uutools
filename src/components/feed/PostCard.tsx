"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, memo, useEffect, useMemo, useState } from "react";
import {
  Heart,
  MessageCircle,
  Pencil,
  Share2,
  Star,
  FileText,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, BadgeList } from "@/components/ui/Badge";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { useToast } from "@/components/ui/Toast";
import { CommentsPanel } from "@/components/feed/CommentsPanel";
import { buildBadges, classSectionLabel } from "@/lib/badges";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  fetchClassById,
  fetchSemesterById,
  fetchSubjectById,
} from "@/lib/directory";
import {
  demoAddComment,
  demoDeletePost,
  demoRecordShare,
  demoToggleCommentLike,
  demoToggleFavourite,
  demoToggleLike,
  demoUpdatePost,
} from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/client";
import { studyFileDisplayName, studyTypeLabel } from "@/lib/study-meta";
import type {
  ClassRole,
  ClassRow,
  Comment,
  Post,
  Profile,
  Section,
  Semester,
  Subject,
} from "@/lib/types";

function isOptimizableImage(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith("supabase.co") || host === "api.uuonline.in";
  } catch {
    return false;
  }
}

function PostCardInner({
  post: initialPost,
  author: authorOverride,
  initialLiked,
  initialFavoured,
  initialComments,
  people: peopleOverride,
  roles: rolesOverride,
  classes: classesOverride,
  sections: sectionsOverride,
  popularThreshold: thresholdOverride,
  onDeleted,
}: {
  post: Post;
  author?: Profile | null;
  initialLiked?: boolean;
  initialFavoured?: boolean;
  initialComments?: Comment[];
  people?: Record<string, Profile>;
  roles?: ClassRole[];
  classes?: ClassRow[];
  sections?: Section[];
  popularThreshold?: number;
  onDeleted?: (postId: string) => void;
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
  const [commentPeople, setCommentPeople] = useState<Record<string, Profile>>(
    {}
  );
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    () => new Set()
  );
  const [replyTo, setReplyTo] = useState<{
    comment: Comment;
    author: Profile | null;
  } | null>(null);
  const [commentsLoaded, setCommentsLoaded] = useState(
    Boolean(initialComments?.length)
  );
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(initialPost.caption || "");

  useEffect(() => {
    setPost(initialPost);
    setEditCaption(initialPost.caption || "");
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
      const list = catalog.comments.filter((c) => c.post_id === post.id);
      setComments(list);
      const people: Record<string, Profile> = {};
      for (const p of catalog.profiles) people[p.id] = p;
      setCommentPeople(people);
      const likedIds = new Set(
        (catalog.commentLikes || [])
          .filter((l) => l.user_id === user?.id)
          .filter((l) => list.some((c) => c.id === l.comment_id))
          .map((l) => l.comment_id)
      );
      setLikedCommentIds(likedIds);
      setCommentsLoaded(true);
      return;
    }
    setLiked(Boolean(initialLiked));
    setFavoured(Boolean(initialFavoured));
    if (initialComments?.length) {
      setComments(initialComments);
      if (peopleOverride) setCommentPeople(peopleOverride);
      setCommentsLoaded(true);
    } else {
      setComments([]);
      setCommentsLoaded(false);
    }
  }, [
    demoMode,
    user,
    catalog.likes,
    catalog.favourites,
    catalog.comments,
    catalog.commentLikes,
    catalog.profiles,
    post.id,
    initialLiked,
    initialFavoured,
    initialComments,
    peopleOverride,
  ]);

  useEffect(() => {
    if (!showComments || demoMode || commentsLoaded) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const list = (data as Comment[]) || [];
      setComments(list);

      const authorIds = [...new Set(list.map((c) => c.author_id))];
      const people: Record<string, Profile> = { ...(peopleOverride || {}) };
      if (authorIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", authorIds);
        for (const p of (profiles as Profile[]) || []) people[p.id] = p;
      }
      if (cancelled) return;
      setCommentPeople(people);

      if (user && list.length) {
        const { data: likes } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", user.id)
          .in(
            "comment_id",
            list.map((c) => c.id)
          );
        if (!cancelled) {
          setLikedCommentIds(
            new Set(
              ((likes as { comment_id: string }[]) || []).map((l) => l.comment_id)
            )
          );
        }
      }
      setCommentsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showComments,
    demoMode,
    commentsLoaded,
    post.id,
    user,
    peopleOverride,
  ]);

  const author =
    authorOverride ??
    catalog.profiles.find((p) => p.id === post.author_id) ??
    null;

  const classes = classesOverride ?? catalog.classes;
  const sections = sectionsOverride ?? catalog.sections;

  const authorClassLabel = useMemo(() => {
    if (!author) return "";
    const cls = classes.find((c) => c.id === author.class_id);
    const sec = sections.find((s) => s.id === author.section_id);
    return classSectionLabel(cls, sec);
  }, [author, classes, sections]);

  const [studyClassName, setStudyClassName] = useState("");
  const [studySemesterName, setStudySemesterName] = useState("");
  const [studySubjectName, setStudySubjectName] = useState("");

  useEffect(() => {
    if (post.kind !== "study") {
      setStudyClassName("");
      setStudySemesterName("");
      setStudySubjectName("");
      return;
    }

    if (demoMode) {
      const cls = catalog.classes.find((c) => c.id === post.class_id);
      const sem = (catalog.semesters || []).find(
        (s: Semester) => s.id === post.semester_id
      );
      const sub = catalog.subjects.find((s: Subject) => s.id === post.subject_id);
      setStudyClassName(cls?.name || "");
      setStudySemesterName(sem?.name || "");
      setStudySubjectName(sub?.name || "");
      return;
    }

    let cancelled = false;
    void (async () => {
      const [cls, sem, sub] = await Promise.all([
        post.class_id
          ? classes.find((c) => c.id === post.class_id) ||
            (await fetchClassById(post.class_id))
          : null,
        post.semester_id ? fetchSemesterById(post.semester_id) : null,
        post.subject_id ? fetchSubjectById(post.subject_id) : null,
      ]);
      if (cancelled) return;
      setStudyClassName((cls as ClassRow | null)?.name || "");
      setStudySemesterName(sem?.name || "");
      setStudySubjectName(sub?.name || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [
    post.kind,
    post.class_id,
    post.semester_id,
    post.subject_id,
    demoMode,
    catalog.classes,
    catalog.semesters,
    catalog.subjects,
    classes,
  ]);

  const fileLabel = studyFileDisplayName(
    post.media_name,
    post.media_url,
    post.media_type
  );

  const badges = useMemo(() => {
    if (!author) return [];
    return buildBadges({
      profile: author,
      roles: rolesOverride ?? catalog.roles,
      classes,
      sections,
      post,
      popularThreshold: thresholdOverride ?? catalog.popularThreshold,
      roleDefinitions: catalog.roleDefinitions,
    });
  }, [
    author,
    catalog.roles,
    catalog.popularThreshold,
    rolesOverride,
    classes,
    sections,
    thresholdOverride,
    post,
  ]);

  async function saveCaption() {
    if (!user || busy) return;
    if (user.id !== post.author_id) return;
    const next = editCaption.trim();
    setBusy(true);
    if (demoMode) {
      const res = demoUpdatePost(user.id, post.id, next);
      setBusy(false);
      if (!res.ok) {
        toast.error(res.error || "Could not update");
        return;
      }
      if (res.post) setPost(res.post);
      else setPost((p) => ({ ...p, caption: next }));
      setEditing(false);
      toast.success("Post updated");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("posts")
      .update({ caption: next })
      .eq("id", post.id)
      .eq("author_id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPost((p) => ({ ...p, caption: next }));
    setEditing(false);
    toast.success("Post updated");
  }

  async function deleteOwnPost() {
    if (!user || busy) return;
    if (user.id !== post.author_id) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setBusy(true);
    if (demoMode) {
      const res = demoDeletePost(user.id, post.id);
      setBusy(false);
      if (!res.ok) {
        toast.error(res.error || "Could not delete");
        return;
      }
      setGone(true);
      onDeleted?.(post.id);
      toast.success("Post deleted");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("author_id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setGone(true);
    onDeleted?.(post.id);
    toast.success("Post deleted");
  }

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
    const parentId = replyTo?.comment.id || null;
    if (demoMode) {
      const created = demoAddComment(user.id, post.id, body, parentId);
      if (created) {
        setComments((prev) => [...prev, created]);
        setPost((p) => ({ ...p, comment_count: p.comment_count + 1 }));
        setCommentPeople((prev) => ({ ...prev, [user.id]: user }));
      }
      setComment("");
      setReplyTo(null);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      post_id: post.id,
      author_id: user.id,
      body,
    };
    if (parentId) payload.parent_id = parentId;
    let { data, error } = await supabase
      .from("comments")
      .insert(payload)
      .select("*")
      .single();
    // Older DBs may not have parent_id yet — retry without it
    if (
      error &&
      parentId &&
      /parent_id|schema cache/i.test(error.message || "")
    ) {
      const retry = await supabase
        .from("comments")
        .insert({ post_id: post.id, author_id: user.id, body })
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    setComments((prev) => [...prev, data as Comment]);
    setCommentPeople((prev) => ({ ...prev, [user.id]: user }));
    setPost((p) => ({ ...p, comment_count: p.comment_count + 1 }));
    setComment("");
    setReplyTo(null);
    setBusy(false);
  }

  async function toggleCommentLike(commentId: string) {
    if (!user || busy) return;
    if (demoMode) {
      const res = demoToggleCommentLike(user.id, commentId);
      setLikedCommentIds((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, like_count: res.like_count } : c
        )
      );
      return;
    }
    const supabase = createClient();
    const wasLiked = likedCommentIds.has(commentId);
    // Optimistic
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const n = Math.max((c.like_count || 0) + (wasLiked ? -1 : 1), 0);
        return { ...c, like_count: n };
      })
    );
    if (wasLiked) {
      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("comment_id", commentId);
      if (error) {
        toast.error(error.message);
        setLikedCommentIds((prev) => new Set(prev).add(commentId));
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, like_count: (c.like_count || 0) + 1 }
              : c
          )
        );
      }
    } else {
      const { error } = await supabase.from("comment_likes").insert({
        user_id: user.id,
        comment_id: commentId,
      });
      if (error) {
        toast.error(
          /relation .*comment_likes|schema cache/i.test(error.message || "")
            ? "Comment likes need a quick DB update — run patch_comment_replies_likes.sql"
            : error.message
        );
        setLikedCommentIds((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, like_count: Math.max((c.like_count || 0) - 1, 0) }
              : c
          )
        );
      }
    }
  }

  if (gone || !author) return null;

  const isOwner = user?.id === post.author_id;

  return (
    <article id={`post-${post.id}`} className="card overflow-hidden">
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
            {authorClassLabel ? `${authorClassLabel} · ` : ""}
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        {isOwner ? (
          <MoreMenu
            label="Post options"
            items={[
              {
                label: "Edit caption",
                icon: <Pencil size={16} />,
                disabled: busy,
                onClick: () => {
                  setEditCaption(post.caption || "");
                  setEditing(true);
                },
              },
              {
                label: "Delete post",
                icon: <Trash2 size={16} />,
                danger: true,
                disabled: busy,
                onClick: () => {
                  void deleteOwnPost();
                },
              },
            ]}
          />
        ) : null}
      </header>

      {editing ? (
        <div className="space-y-2 px-4 pb-3">
          <textarea
            className="input min-h-[80px] py-2 text-[15px]"
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              className="btn btn-ghost border-0"
              aria-label="Cancel edit"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setEditCaption(post.caption || "");
              }}
            >
              <X size={18} />
            </button>
            <button
              type="button"
              className="btn btn-ghost border-0 text-[var(--popular)]"
              aria-label="Save caption"
              disabled={busy}
              onClick={() => void saveCaption()}
            >
              <Check size={18} />
            </button>
          </div>
        </div>
      ) : post.caption ? (
        <p className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-relaxed">
          {post.caption}
        </p>
      ) : null}

      {post.kind === "study" ? (
        <div className="mx-4 mb-3 space-y-3 rounded-xl border border-[var(--line)] bg-[#141414] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
              Study material
            </p>
            {post.study_type ? (
              <span className="rounded-md bg-[#1f1f1f] px-2 py-0.5 text-[11px] text-[var(--text)]">
                {studyTypeLabel(post.study_type)}
              </span>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm sm:grid-cols-3">
            {studySubjectName ? (
              <div className="min-w-0">
                <dt className="text-[11px] text-[var(--muted)]">Subject</dt>
                <dd className="truncate font-medium">{studySubjectName}</dd>
              </div>
            ) : null}
            {studyClassName ? (
              <div className="min-w-0">
                <dt className="text-[11px] text-[var(--muted)]">Class</dt>
                <dd className="truncate font-medium">{studyClassName}</dd>
              </div>
            ) : null}
            {studySemesterName ? (
              <div className="min-w-0">
                <dt className="text-[11px] text-[var(--muted)]">Semester</dt>
                <dd className="truncate font-medium">{studySemesterName}</dd>
              </div>
            ) : null}
            {post.study_unit ? (
              <div className="min-w-0">
                <dt className="text-[11px] text-[var(--muted)]">Unit</dt>
                <dd className="truncate font-medium">{post.study_unit}</dd>
              </div>
            ) : null}
            {post.academic_year ? (
              <div className="min-w-0">
                <dt className="text-[11px] text-[var(--muted)]">Year</dt>
                <dd className="truncate font-medium">{post.academic_year}</dd>
              </div>
            ) : null}
          </dl>
          {(post.media_type === "pdf" || post.media_url) && (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[#1a1a1a] p-3">
              <FileText className="shrink-0 text-[var(--accent)]" size={20} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={fileLabel}>
                  {fileLabel}
                </p>
                {post.media_url ? (
                  <a
                    href={post.media_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Open file
                  </a>
                ) : (
                  <p className="text-xs text-[var(--muted)]">No file attached</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {post.media_type === "image" && post.media_url && (
        isOptimizableImage(post.media_url) ? (
          <Image
            src={post.media_url}
            alt=""
            width={1080}
            height={1080}
            sizes="(max-width: 640px) 100vw, 630px"
            className="mb-3 max-h-[520px] w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="mb-3 max-h-[520px] w-full object-cover"
          />
        )
      )}

      {post.media_type === "image" && !post.media_url && post.kind !== "study" && (
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

      {post.media_type === "pdf" && post.kind !== "study" && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[#1a1a1a] p-4">
          <FileText className="text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{fileLabel}</p>
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

      {showComments ? (
        <CommentsPanel
          comments={comments}
          people={{
            ...(peopleOverride || {}),
            ...commentPeople,
            ...(author ? { [author.id]: author } : {}),
            ...(user ? { [user.id]: user } : {}),
          }}
          likedCommentIds={likedCommentIds}
          currentUser={user}
          draft={comment}
          setDraft={setComment}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          busy={busy}
          loading={!demoMode && !commentsLoaded}
          onSubmit={(e) => void submitComment(e)}
          onToggleLike={(id) => void toggleCommentLike(id)}
        />
      ) : null}
    </article>
  );
}

export const PostCard = memo(PostCardInner);
