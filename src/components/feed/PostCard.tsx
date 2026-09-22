"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

export function PostCard({
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.media_url}
          alt=""
          className="mb-3 max-h-[520px] w-full object-cover"
        />
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

      {showComments && (
        <div className="space-y-3 border-t border-[var(--line)] px-4 py-3">
          {comments.map((c) => {
            const a =
              c.author_id === author.id
                ? author
                : peopleOverride?.[c.author_id] ||
                  catalog.profiles.find((p) => p.id === c.author_id);
            const label =
              a?.display_name?.trim() ||
              (c.author_id === user?.id ? "You" : null) ||
              a?.username ||
              "User";
            return (
              <div key={c.id} className="text-sm">
                <span className="font-semibold">{label}</span>{" "}
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
