"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { prepareUploadFile } from "@/lib/uploads";
import {
  loadComposerStudyPrefs,
  loadRecentSubjects,
  pushRecentSubject,
  saveComposerStudyPrefs,
  type RecentSubject,
} from "@/lib/study-prefs";
import { UploadTile } from "@/components/ui/UploadTile";
import { useToast } from "@/components/ui/Toast";
import type {
  ClassRow,
  MediaType,
  PostKind,
  Semester,
  StudyType,
  Subject,
} from "@/lib/types";

type PreparedMedia = {
  file: File;
  mediaType: "image" | "pdf" | "video" | "audio";
};

export function Composer({ onPosted }: { onPosted?: () => void }) {
  const { user, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();
  const [caption, setCaption] = useState("");
  const [kind, setKind] = useState<PostKind>("social");
  const [studyType, setStudyType] = useState<StudyType>("unit");
  const [studyClassId, setStudyClassId] = useState("");
  const [studySemesterId, setStudySemesterId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studyUnit, setStudyUnit] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<PreparedMedia | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isOfficialRole, setIsOfficialRole] = useState(false);
  const [recentSubjects, setRecentSubjects] = useState<RecentSubject[]>([]);
  const prefsHydrated = useRef(false);
  const prepareGen = useRef(0);

  // Remember last study fields + recent subjects
  useEffect(() => {
    if (prefsHydrated.current) return;
    prefsHydrated.current = true;
    const prefs = loadComposerStudyPrefs();
    if (prefs.classId) setStudyClassId(prefs.classId);
    if (prefs.semesterId) setStudySemesterId(prefs.semesterId);
    if (prefs.subjectId) setSubjectId(prefs.subjectId);
    if (prefs.studyType) setStudyType(prefs.studyType as StudyType);
    if (prefs.academicYear) setAcademicYear(prefs.academicYear);
    if (prefs.studyUnit) setStudyUnit(prefs.studyUnit);
    setRecentSubjects(loadRecentSubjects());
  }, []);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!user) return;
    if (!studyClassId && user.class_id) setStudyClassId(user.class_id);
  }, [user, studyClassId]);

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      const collegeId = user.college_id || catalog.colleges[0]?.id;
      setClasses(catalog.classes.filter((c) => c.college_id === collegeId));
      setIsOfficialRole(
        catalog.roles.some(
          (r) =>
            r.user_id === user.id &&
            (r.role === "cr" || r.role === "professor")
        ) ||
          (catalog.teacherDelegations || []).some(
            (d) =>
              d.teacher_id === user.id &&
              d.college_id === user.college_id &&
              d.is_active &&
              d.can_post_official
          )
      );
      return;
    }
    if (!user.college_id) {
      setClasses([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const [classRes, roleRes, delegRes] = await Promise.all([
        supabase
          .from("classes")
          .select("*")
          .eq("college_id", user.college_id!)
          .order("name"),
        user.class_id
          ? supabase
              .from("class_roles")
              .select("role")
              .eq("user_id", user.id)
              .eq("class_id", user.class_id)
          : Promise.resolve({ data: [] }),
        user.college_id
          ? supabase
              .from("teacher_delegations")
              .select("can_post_official,is_active")
              .eq("teacher_id", user.id)
              .eq("college_id", user.college_id)
              .eq("is_active", true)
              .eq("can_post_official", true)
              .limit(1)
          : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      setClasses((classRes.data as ClassRow[]) || []);
      const roleOk = ((roleRes.data as { role: string }[]) || []).some(
        (r) => r.role === "cr" || r.role === "professor"
      );
      const delegOk = ((delegRes.data as unknown[]) || []).length > 0;
      setIsOfficialRole(roleOk || delegOk || user.is_admin);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    user,
    demoMode,
    catalog.classes,
    catalog.colleges,
    catalog.roles,
    catalog.teacherDelegations,
  ]);

  useEffect(() => {
    if (!studyClassId) {
      setSemesters([]);
      setSubjects([]);
      return;
    }
    if (demoMode) {
      setSemesters(
        (catalog.semesters || []).filter((s) => s.class_id === studyClassId)
      );
      setSubjects(
        catalog.subjects.filter((s) =>
          studySemesterId
            ? s.semester_id === studySemesterId
            : s.class_id === studyClassId
        )
      );
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const [semRes, subRes] = await Promise.all([
        supabase
          .from("semesters")
          .select("*")
          .eq("class_id", studyClassId)
          .order("sort_order")
          .order("name"),
        studySemesterId
          ? supabase
              .from("subjects")
              .select("*")
              .eq("semester_id", studySemesterId)
              .order("name")
          : supabase
              .from("subjects")
              .select("*")
              .eq("class_id", studyClassId)
              .order("name"),
      ]);
      if (cancelled) return;
      setSemesters((semRes.data as Semester[]) || []);
      setSubjects((subRes.data as Subject[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    studyClassId,
    studySemesterId,
    demoMode,
    catalog.semesters,
    catalog.subjects,
  ]);

  const subjectOptions = useMemo(() => subjects, [subjects]);
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    const opts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const start = y - i;
      opts.push(`${start}-${String(start + 1).slice(-2)}`);
    }
    return opts;
  }, []);

  const recentForClass = useMemo(() => {
    return recentSubjects.filter((r) => {
      if (studyClassId && r.classId && r.classId !== studyClassId) return false;
      if (studySemesterId && r.semesterId && r.semesterId !== studySemesterId)
        return false;
      return true;
    });
  }, [recentSubjects, studyClassId, studySemesterId]);

  const onPickFile = useCallback(
    async (picked: File | undefined) => {
      const gen = ++prepareGen.current;
      setError("");
      setPrepared(null);
      if (!picked) {
        setFile(null);
        setPreparing(false);
        return;
      }
      setFile(picked);
      setPreparing(true);
      const uploadKind = kind === "study" ? "study-file" : "post-image";
      const res = await prepareUploadFile(picked, uploadKind);
      if (gen !== prepareGen.current) return;
      setPreparing(false);
      if ("error" in res) {
        setError(res.error);
        setFile(null);
        toast.error(res.error);
        return;
      }
      setPrepared({ file: res.file, mediaType: res.mediaType });
      setFile(res.file);
      if (res.file.size < picked.size && res.mediaType === "image") {
        const from = (picked.size / (1024 * 1024)).toFixed(1);
        const to = (res.file.size / (1024 * 1024)).toFixed(1);
        toast.success(`Compressed ${from} MB → ${to} MB`);
      }
    },
    [kind, toast]
  );

  // Re-validate when switching Campus ↔ Study
  useEffect(() => {
    if (!file) {
      setPrepared(null);
      return;
    }
    void onPickFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  if (!user) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || busy || preparing) return;
    if (!caption.trim()) {
      setError("Write a caption before sharing.");
      return;
    }
    if (kind === "study") {
      if (!studyClassId) {
        setError("Select class for study material.");
        return;
      }
      if (!studySemesterId) {
        setError("Select semester for study material.");
        return;
      }
      if (!subjectId) {
        setError("Select subject for study material.");
        return;
      }
      if (!studyType) {
        setError("Select what kind of material this is.");
        return;
      }
      if (!studyUnit.trim()) {
        setError("Enter the unit (e.g. Unit 1).");
        return;
      }
      if (!academicYear.trim()) {
        setError("Select the academic year this material was given.");
        return;
      }
      if (!file && !prepared) {
        setError("Attach a PDF or image for study material.");
        return;
      }
    }
    setBusy(true);
    setError("");
    setProgress(8);
    setProgressLabel("Preparing…");

    let media_url: string | null = null;
    let media_type: MediaType = kind === "study" ? "pdf" : "none";
    let media_name: string | null = null;
    const uploadKind = kind === "study" ? "study-file" : "post-image";

    try {
      const active = prepared?.file || file;
      if (active) {
        media_name = active.name;
        setProgress(25);
        setProgressLabel(
          prepared ? "Uploading…" : "Compressing & uploading…"
        );
        if (demoMode) {
          const res = await demoFileToDataUrl(active, uploadKind);
          if ("error" in res) {
            setError(res.error);
            setBusy(false);
            setProgress(0);
            return;
          }
          media_url = res.url;
          media_name = res.fileName || active.name;
          media_type =
            res.mediaType === "pdf"
              ? "pdf"
              : res.mediaType === "video"
                ? "video"
                : "image";
        } else {
          const res = await uploadToSupabase(active, uploadKind, user.id, {
            alreadyPrepared: Boolean(prepared),
            mediaType: prepared?.mediaType,
          });
          if ("error" in res) {
            setError(res.error);
            toast.error(res.error);
            setBusy(false);
            setProgress(0);
            return;
          }
          media_url = res.url;
          media_name = res.fileName || active.name;
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

      setProgress(70);
      setProgressLabel("Posting…");

      const isOfficial = kind === "study" && (user.is_admin || isOfficialRole);

      if (demoMode) {
        const collegeId = user.college_id || catalog.colleges[0]?.id;
        if (!collegeId) {
          setError("Pick a college in onboarding before posting.");
          setBusy(false);
          setProgress(0);
          return;
        }
        demoCreatePost({
          author_id: user.id,
          college_id: collegeId,
          class_id: kind === "study" ? studyClassId : user.class_id,
          section_id: user.section_id,
          semester_id: kind === "study" ? studySemesterId : null,
          kind,
          study_type: kind === "study" ? studyType : null,
          subject_id: kind === "study" ? subjectId : null,
          study_unit: kind === "study" ? studyUnit.trim() : null,
          academic_year: kind === "study" ? academicYear.trim() : null,
          caption: caption.trim(),
          media_url,
          media_name,
          media_type,
          is_official_verified: Boolean(isOfficial),
        });
      } else {
        if (!user.college_id) {
          setError("Finish onboarding (college) before posting.");
          toast.error("Finish onboarding before posting");
          setBusy(false);
          setProgress(0);
          return;
        }
        const supabase = createClient();
        const row = {
          author_id: user.id,
          college_id: user.college_id,
          class_id: kind === "study" ? studyClassId : user.class_id,
          section_id: user.section_id,
          semester_id: kind === "study" ? studySemesterId : null,
          kind,
          study_type: kind === "study" ? studyType : null,
          subject_id: kind === "study" ? subjectId : null,
          study_unit: kind === "study" ? studyUnit.trim() : null,
          academic_year: kind === "study" ? academicYear.trim() : null,
          caption: caption.trim(),
          media_url,
          media_name,
          media_type,
          is_official_verified: Boolean(isOfficial),
        };
        let { error: insertError } = await supabase.from("posts").insert(row);
        if (
          insertError &&
          (insertError.code === "PGRST204" ||
            /media_name|study_unit|academic_year|semester_id|schema cache|Could not find/i.test(
              insertError.message
            ))
        ) {
          const legacy = {
            author_id: row.author_id,
            college_id: row.college_id,
            class_id: row.class_id,
            section_id: row.section_id,
            kind: row.kind,
            study_type: row.study_type,
            subject_id: row.subject_id,
            caption: row.caption,
            media_url: row.media_url,
            media_type: row.media_type,
            is_official_verified: row.is_official_verified,
          };
          const retry = await supabase.from("posts").insert(legacy);
          insertError = retry.error;
          if (!insertError) {
            toast.error(
              "Post shared — run supabase/patch_media_name.sql so filenames save."
            );
          }
        }
        if (insertError) {
          setError(insertError.message);
          toast.error(insertError.message);
          setBusy(false);
          setProgress(0);
          return;
        }
      }

      if (kind === "study") {
        saveComposerStudyPrefs({
          classId: studyClassId,
          semesterId: studySemesterId,
          subjectId,
          studyType,
          academicYear,
          studyUnit: studyUnit.trim(),
        });
        const sub = subjects.find((s) => s.id === subjectId);
        if (sub) {
          pushRecentSubject({
            id: sub.id,
            name: sub.name,
            classId: studyClassId,
            semesterId: studySemesterId,
          });
          setRecentSubjects(loadRecentSubjects());
        }
      }

      setProgress(100);
      setProgressLabel("Done");
      setCaption("");
      setFile(null);
      setPrepared(null);
      setStudyUnit("");
      // keep class/semester/subject/year for next upload (faster)
      toast.success("Post shared");
      notifyFeedUpdated();
      onPosted?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to share post";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        setProgress(0);
        setProgressLabel("");
      }, 400);
    }
  }

  const tileHint = preparing
    ? "Compressing…"
    : prepared
      ? prepared.mediaType === "pdf"
        ? prepared.file.name
        : "Ready to upload"
      : file
        ? file.name
        : null;

  return (
    <form className="space-y-3" onSubmit={(e) => void submit(e)}>
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
      </div>
      {kind === "study" ? (
        <div className="grid gap-2 rounded-lg border border-[var(--line)] bg-[#121212] p-3 sm:grid-cols-2">
          <p className="text-xs text-[var(--muted)] sm:col-span-2">
            Last choices are remembered. Use recent subjects for a quick pick.
          </p>
          {recentForClass.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              {recentForClass.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    subjectId === r.id
                      ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                      : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  }`}
                  onClick={() => {
                    setSubjectId(r.id);
                    if (r.classId) setStudyClassId(r.classId);
                    if (r.semesterId) setStudySemesterId(r.semesterId);
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          ) : null}
          <select
            className="input"
            value={studyClassId}
            onChange={(e) => {
              setStudyClassId(e.target.value);
              setStudySemesterId("");
              setSubjectId("");
            }}
            required
          >
            <option value="">Class *</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={studySemesterId}
            onChange={(e) => {
              setStudySemesterId(e.target.value);
              setSubjectId("");
            }}
            required
            disabled={!studyClassId}
          >
            <option value="">Semester *</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            disabled={!studySemesterId && !studyClassId}
          >
            <option value="">Subject *</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={studyType}
            onChange={(e) => setStudyType(e.target.value as StudyType)}
            required
          >
            <option value="unit">Unit / Notes PDF</option>
            <option value="assignment">Assignment</option>
            <option value="practical">Practical</option>
            <option value="whiteboard">Whiteboard</option>
            <option value="other">Other</option>
          </select>
          <input
            className="input"
            placeholder="Unit * (e.g. Unit 1)"
            value={studyUnit}
            onChange={(e) => setStudyUnit(e.target.value)}
            required
          />
          <select
            className="input"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            required
          >
            <option value="">Academic year given *</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label className="mb-1 block text-xs text-[var(--muted)]">
          {kind === "study"
            ? "Attach image or PDF (max 10 MB; compresses as soon as you pick)"
            : "Optional image (max 10 MB; compresses on pick)"}
        </label>
        <UploadTile
          accept={
            kind === "study"
              ? "image/jpeg,image/png,image/webp,image/gif,application/pdf"
              : "image/jpeg,image/png,image/webp,image/gif"
          }
          onPick={(f) => void onPickFile(f)}
          previewUrl={previewUrl}
          label={kind === "study" ? "Add file" : "Add photo"}
          disabled={busy || preparing}
          size={96}
          hint={tileHint}
        />
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      {busy && progress > 0 ? (
        <div className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            {progressLabel} {Math.floor(progress)}%
          </p>
        </div>
      ) : null}
      <button
        className="btn btn-primary ml-auto"
        type="submit"
        disabled={busy || preparing}
      >
        {busy ? "Sharing…" : preparing ? "Preparing…" : "Share"}
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
