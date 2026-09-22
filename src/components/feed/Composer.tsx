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
import { UploadTile } from "@/components/ui/UploadTile";
import { useToast } from "@/components/ui/Toast";
import type {
  ClassRow,
  MediaType,
  PostKind,
  Section,
  Semester,
  StudyType,
  Subject,
} from "@/lib/types";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isOfficialRole, setIsOfficialRole] = useState(false);

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
  }, [user, demoMode, catalog.classes, catalog.colleges, catalog.roles, catalog.teacherDelegations]);

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
  }, [studyClassId, studySemesterId, demoMode, catalog.semesters, catalog.subjects]);

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

  if (!user) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
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
      if (!file) {
        setError("Attach a PDF or image for study material.");
        return;
      }
    }
    setBusy(true);
    setError("");

    let media_url: string | null = null;
    let media_type: MediaType = kind === "study" ? "pdf" : "none";
    let media_name: string | null = null;
    const uploadKind = kind === "study" ? "study-file" : "post-image";

    try {
      if (file) {
        media_name = file.name;
        if (demoMode) {
          const res = await demoFileToDataUrl(file, uploadKind);
          if ("error" in res) {
            setError(res.error);
            setBusy(false);
            return;
          }
          media_url = res.url;
          media_name = res.fileName || file.name;
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
          media_name = res.fileName || file.name;
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
          return;
        }
        const supabase = createClient();
        const { error: insertError } = await supabase.from("posts").insert({
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
      setStudyUnit("");
      setSubjectId("");
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
      </div>
      {kind === "study" ? (
        <div className="grid gap-2 rounded-lg border border-[var(--line)] bg-[#121212] p-3 sm:grid-cols-2">
          <p className="text-xs text-[var(--muted)] sm:col-span-2">
            Study material — class, semester, subject, unit, year, and file are
            required.
          </p>
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
            ? "Attach image or PDF (max 10 MB; large photos auto-compress)"
            : "Optional image (jpeg/png/webp/gif, max 10 MB; auto-compress)"}
        </label>
        <UploadTile
          accept={
            kind === "study"
              ? "image/jpeg,image/png,image/webp,image/gif,application/pdf"
              : "image/jpeg,image/png,image/webp,image/gif"
          }
          onPick={(f) => setFile(f || null)}
          previewUrl={previewUrl}
          label={kind === "study" ? "Add file" : "Add photo"}
          disabled={busy}
          size={96}
        />
        {file && !previewUrl ? (
          <p className="mt-1 truncate text-xs text-[var(--muted)]">{file.name}</p>
        ) : null}
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <button className="btn btn-primary ml-auto" type="submit" disabled={busy}>
        {busy ? "Sharing…" : "Share"}
      </button>
    </form>
  );
}

export function StudyFiltersBar({
  studyOnly,
  setStudyOnly,
  classOnly,
  setClassOnly,
  verifiedOnly,
  setVerifiedOnly,
  classId,
  setClassId,
  sectionId,
  setSectionId,
  subjectId,
  setSubjectId,
  studyType,
  setStudyType,
}: {
  studyOnly: boolean;
  setStudyOnly: (v: boolean) => void;
  classOnly: boolean;
  setClassOnly: (v: boolean) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (v: boolean) => void;
  classId: string;
  setClassId: (v: string) => void;
  sectionId: string;
  setSectionId: (v: string) => void;
  subjectId: string;
  setSubjectId: (v: string) => void;
  studyType: string;
  setStudyType: (v: string) => void;
}) {
  const catalog = useDemoCatalog();
  const { user, demoMode } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (demoMode) {
      setClasses(
        catalog.classes.filter(
          (c) => c.college_id === (user?.college_id || catalog.colleges[0]?.id)
        )
      );
      return;
    }
    if (!user?.college_id) {
      setClasses([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("classes")
        .select("*")
        .eq("college_id", user.college_id!)
        .order("name");
      if (!cancelled) setClasses((data as ClassRow[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [demoMode, catalog.classes, catalog.colleges, user?.college_id]);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSubjects([]);
      return;
    }
    if (demoMode) {
      setSections(catalog.sections.filter((s) => s.class_id === classId));
      setSubjects(catalog.subjects.filter((s) => s.class_id === classId));
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [secRes, subRes] = await Promise.all([
        supabase.from("sections").select("*").eq("class_id", classId).order("name"),
        supabase.from("subjects").select("*").eq("class_id", classId).order("name"),
      ]);
      if (cancelled) return;
      setSections((secRes.data as Section[]) || []);
      setSubjects((subRes.data as Subject[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, demoMode, catalog.sections, catalog.subjects]);

  return (
    <div className="sticky top-0 z-20 space-y-3 border-b border-[var(--line)] bg-black/90 px-3 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-5">
        <label className="check-row">
          <input
            type="checkbox"
            checked={studyOnly}
            onChange={(e) => setStudyOnly(e.target.checked)}
          />
          Study Only
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={classOnly}
            onChange={(e) => setClassOnly(e.target.checked)}
          />
          Class Only
        </label>
      </div>

      {studyOnly && (
        <div className="grid gap-2 rounded-lg border border-[var(--line)] bg-[#121212] p-3 sm:grid-cols-2">
          <label className="check-row sm:col-span-2">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Verified only
            <span className="text-xs text-[var(--muted)]">(optional)</span>
          </label>
          <select
            className="input"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
              setSubjectId("");
            }}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!classId}
          >
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={!classId}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={studyType}
            onChange={(e) => setStudyType(e.target.value)}
          >
            <option value="">All study types</option>
            <option value="unit">Units / PDFs</option>
            <option value="assignment">Assignments</option>
            <option value="practical">Practicals</option>
            <option value="whiteboard">Whiteboard</option>
          </select>
        </div>
      )}
    </div>
  );
}

export function setPopularThreshold(value: number) {
  const state = getDemoState();
  state.popularThreshold = value;
  saveDemoState(state);
}
