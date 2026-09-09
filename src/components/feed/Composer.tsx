"use client";

import { FormEvent, useMemo, useState } from "react";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { demoCreatePost, getDemoState, saveDemoState } from "@/lib/demo-store";
import type { PostKind, StudyType } from "@/lib/types";

export function Composer({ onPosted }: { onPosted?: () => void }) {
  const { user } = useAuth();
  const catalog = useDemoCatalog();
  const [caption, setCaption] = useState("");
  const [kind, setKind] = useState<PostKind>("social");
  const [studyType, setStudyType] = useState<StudyType>("unit");
  const [subjectId, setSubjectId] = useState("");

  const subjects = useMemo(
    () => catalog.subjects.filter((s) => s.class_id === user?.class_id),
    [catalog.subjects, user?.class_id]
  );

  if (!user) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !caption.trim()) return;

    const isOfficial = catalog.roles.some(
      (r) =>
        r.user_id === user.id &&
        r.class_id === user.class_id &&
        (r.role === "cr" || r.role === "professor")
    );

    demoCreatePost({
      author_id: user.id,
      college_id: user.college_id || catalog.colleges[0]?.id,
      class_id: user.class_id,
      section_id: user.section_id,
      kind,
      study_type: kind === "study" ? studyType : null,
      subject_id: kind === "study" ? subjectId || null : null,
      caption: caption.trim(),
      media_url: null,
      media_type: kind === "study" ? "pdf" : "none",
      is_official_verified: kind === "study" && isOfficial,
    });
    setCaption("");
    onPosted?.();
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
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        )}
        <button className="btn btn-primary ml-auto" type="submit">
          Share
        </button>
      </div>
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
  const { user } = useAuth();

  const classes = catalog.classes.filter(
    (c) => c.college_id === (user?.college_id || catalog.colleges[0]?.id)
  );
  const sections = catalog.sections.filter((s) => s.class_id === classId);
  const subjects = catalog.subjects.filter((s) => s.class_id === classId);

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
            <span className="text-xs text-[var(--muted)]">(default on)</span>
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
