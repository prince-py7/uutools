"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoCreatePost,
  demoFileToDataUrl,
  getDemoState,
  saveDemoState,
} from "@/lib/demo-store";
import { notifyFeedUpdated } from "@/lib/feed";
import { createClient } from "@/lib/supabase/client";
import { uploadToSupabase } from "@/lib/supabase/upload";
import { useToast } from "@/components/ui/Toast";
import type { MediaType, PostKind, StudyType, Subject } from "@/lib/types";

export function Composer({ onPosted }: { onPosted?: () => void }) {
  const { user, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();
  const [caption, setCaption] = useState("");
  const [kind, setKind] = useState<PostKind>("social");
  const [studyType, setStudyType] = useState<StudyType>("unit");
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isOfficialRole, setIsOfficialRole] = useState(false);

  useEffect(() => {
    if (!user?.class_id) {
      setSubjects([]);
      setIsOfficialRole(false);
      return;
    }
    if (demoMode) {
      setSubjects(catalog.subjects.filter((s) => s.class_id === user.class_id));
      setIsOfficialRole(
        catalog.roles.some(
          (r) =>
            r.user_id === user.id &&
            r.class_id === user.class_id &&
            (r.role === "cr" || r.role === "professor")
        )
      );
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [subRes, roleRes] = await Promise.all([
        supabase.from("subjects").select("*").eq("class_id", user.class_id!),
        supabase
          .from("class_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("class_id", user.class_id!),
      ]);
      if (cancelled) return;
      setSubjects((subRes.data as Subject[]) || []);
      setIsOfficialRole(
        ((roleRes.data as { role: string }[]) || []).some(
          (r) => r.role === "cr" || r.role === "professor"
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user, demoMode, catalog.subjects, catalog.roles]);

  const subjectOptions = useMemo(() => subjects, [subjects]);

  if (!user) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!caption.trim()) {
      setError("Write a caption before sharing.");
      return;
    }
    setBusy(true);
    setError("");

    let media_url: string | null = null;
    let media_type: MediaType = kind === "study" ? "pdf" : "none";
    const uploadKind = kind === "study" ? "study-file" : "post-image";

    try {
      if (file) {
        if (demoMode) {
          const res = await demoFileToDataUrl(file, uploadKind);
          if ("error" in res) {
            setError(res.error);
            setBusy(false);
            return;
          }
          media_url = res.url;
          media_type =
            res.mediaType === "pdf"
              ? "pdf"
              : res.mediaType === "video"
                ? "video"
                : "image";
        } else {
          const res = await uploadToSupabase(file, uploadKind, user.id);
          if ("error" in res) {
            setError(res.error);
            toast.error(res.error);
            setBusy(false);
            return;
          }
          media_url = res.url;
          media_type =
            res.mediaType === "pdf"
              ? "pdf"
              : res.mediaType === "video"
                ? "video"
                : "image";
        }
      } else if (kind === "social") {
        media_type = "none";
      }

      const isOfficial =
        kind === "study" && (user.is_admin || isOfficialRole);

      if (demoMode) {
        const collegeId = user.college_id || catalog.colleges[0]?.id;
        if (!collegeId) {
          setError("Pick a college in onboarding before posting.");
          setBusy(false);
          return;
        }
        demoCreatePost({
          author_id: user.id,
          college_id: collegeId,
          class_id: user.class_id,
          section_id: user.section_id,
          kind,
          study_type: kind === "study" ? studyType : null,
          subject_id: kind === "study" ? subjectId || null : null,
          caption: caption.trim(),
          media_url,
          media_type,
          is_official_verified: Boolean(isOfficial),
        });
      } else {
        if (!user.college_id) {
          setError("Finish onboarding (college) before posting.");
          toast.error("Finish onboarding before posting");
          setBusy(false);
          return;
        }
        const supabase = createClient();
        const { error: insertError } = await supabase.from("posts").insert({
          author_id: user.id,
          college_id: user.college_id,
          class_id: user.class_id,
          section_id: user.section_id,
          kind,
          study_type: kind === "study" ? studyType : null,
          subject_id: kind === "study" ? subjectId || null : null,
          caption: caption.trim(),
          media_url,
          media_type,
          is_official_verified: Boolean(isOfficial),
        });
        if (insertError) {
          setError(insertError.message);
          toast.error(insertError.message);
          setBusy(false);
          return;
        }
      }

      setCaption("");
      setFile(null);
      toast.success("Post shared");
      notifyFeedUpdated();
      onPosted?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to share post";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <textarea
        className="input min-h-[110px] resize-y py-3"
        placeholder="Share with your campus…"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input w-auto"
          value={kind}
          onChange={(e) => setKind(e.target.value as PostKind)}
        >
          <option value="social">Campus</option>
          <option value="study">Study</option>
        </select>
        {kind === "study" && (
          <>
            <select
              className="input w-auto"
              value={studyType}
              onChange={(e) => setStudyType(e.target.value as StudyType)}
            >
              <option value="unit">Unit / PDF</option>
              <option value="assignment">Assignment</option>
              <option value="practical">Practical</option>
              <option value="whiteboard">Whiteboard</option>
              <option value="other">Other</option>
            </select>
            <select
              className="input w-auto"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">Subject</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs text-[var(--muted)]">
          {kind === "study"
            ? "Attach image or PDF (max 10 MB; large photos auto-compress)"
            : "Optional image (jpeg/png/webp/gif, max 10 MB; auto-compress)"}
        </label>
        <input
          type="file"
          accept={
            kind === "study"
              ? "image/jpeg,image/png,image/webp,image/gif,application/pdf"
              : "image/jpeg,image/png,image/webp,image/gif"
          }
          className="block w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <button className="btn btn-primary ml-auto" type="submit" disabled={busy}>
        {busy ? "Sharing…" : "Share"}
      </button>
    </form>
  );
}

export { StudyFiltersBar } from "@/components/feed/StudyFiltersBar";

export function setPopularThreshold(value: number) {
  const state = getDemoState();
  state.popularThreshold = value;
  saveDemoState(state);
}
