"use client";

import { useEffect, useState } from "react";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { ClassRow, Section, Subject } from "@/lib/types";

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
        supabase
          .from("sections")
          .select("*")
          .eq("class_id", classId)
          .order("name"),
        supabase
          .from("subjects")
          .select("*")
          .eq("class_id", classId)
          .order("name"),
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
          Study
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={classOnly}
            onChange={(e) => setClassOnly(e.target.checked)}
          />
          My class
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
            Verified
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
            <option value="">All types</option>
            <option value="unit">Unit / Notes</option>
            <option value="assignment">Assignment</option>
            <option value="practical">Practical</option>
            <option value="whiteboard">Whiteboard</option>
          </select>
        </div>
      )}
    </div>
  );
}
