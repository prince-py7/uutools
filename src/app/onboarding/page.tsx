"use client";

import { LoadingInline } from "@/components/ui/Loading";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/config";
import type { ClassRow, College, Section, Semester } from "@/lib/types";
import {
  fetchUniversityPhotoFile,
  isUnitedUniversity,
} from "@/lib/university-photo";
import { demoFileToDataUrl } from "@/lib/demo-store";
import { uploadToSupabase } from "@/lib/supabase/upload";

export default function OnboardingPage() {
  const { user, ready, updateProfile, demoMode } = useAuth();
  const demoCatalog = useDemoCatalog();
  const router = useRouter();
  const [collegeId, setCollegeId] = useState("");
  const [classId, setClassId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingDir, setLoadingDir] = useState(!demoMode);
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.onboarding_complete) router.replace("/home");
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user) return;

    if (demoMode || !isSupabaseConfigured()) {
      setColleges(demoCatalog.colleges.filter((c) => c.is_active));
      setClasses(demoCatalog.classes);
      setSemesters(demoCatalog.semesters || []);
      setSections(demoCatalog.sections);
      setLoadingDir(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingDir(true);
      setError("");
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const [colRes, classRes, semRes, secRes] = await Promise.all([
          supabase.from("colleges").select("*").eq("is_active", true).order("name"),
          supabase.from("classes").select("*").order("name"),
          supabase.from("semesters").select("*").order("sort_order").order("name"),
          supabase.from("sections").select("*").order("name"),
        ]);
        if (cancelled) return;
        if (colRes.error) throw new Error(colRes.error.message);
        if (classRes.error) throw new Error(classRes.error.message);
        if (semRes.error) throw new Error(semRes.error.message);
        if (secRes.error) throw new Error(secRes.error.message);
        setColleges((colRes.data as College[]) || []);
        setClasses((classRes.data as ClassRow[]) || []);
        setSemesters((semRes.data as Semester[]) || []);
        setSections((secRes.data as Section[]) || []);
        if (!(colRes.data || []).length) {
          setError(
            "No colleges are available yet. Please check back shortly or contact an admin."
          );
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not load colleges right now. Please try again in a moment."
          );
        }
      } finally {
        if (!cancelled) setLoadingDir(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, demoMode]);

  const filteredClasses = useMemo(
    () => classes.filter((c) => c.college_id === collegeId),
    [classes, collegeId]
  );
  const filteredSemesters = useMemo(
    () => semesters.filter((s) => s.class_id === classId),
    [semesters, classId]
  );
  const filteredSections = useMemo(
    () =>
      sections.filter(
        (s) =>
          s.class_id === classId &&
          (!semesterId || s.semester_id === semesterId || !s.semester_id)
      ),
    [sections, classId, semesterId]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collegeId || !classId || !semesterId || !sectionId) {
      setError("Select college, class, semester, and section");
      return;
    }
    if (!enrollmentId.trim()) {
      setError("Enter your College ID / enrollment number");
      return;
    }
    if (!user) return;
    setSaving(true);
    setError("");

    const college = colleges.find((c) => c.id === collegeId) || null;
    let avatarUrl = user.avatar_url;
    if (isUnitedUniversity(college)) {
      const photo = await fetchUniversityPhotoFile(enrollmentId.trim());
      if (!("error" in photo)) {
        if (demoMode) {
          const data = await demoFileToDataUrl(photo.file, "avatar");
          if (!("error" in data)) avatarUrl = data.url;
        } else {
          const up = await uploadToSupabase(photo.file, "avatar", user.id);
          if (!("error" in up)) avatarUrl = up.url;
        }
      }
    }

    const updated = await updateProfile({
      college_id: collegeId,
      class_id: classId,
      semester_id: semesterId,
      section_id: sectionId,
      enrollment_id: enrollmentId.trim(),
      avatar_url: avatarUrl,
      onboarding_complete: true,
    });
    setSaving(false);
    if (!updated) {
      setError(
        "Could not save your profile. Please try again or contact support."
      );
      return;
    }
    router.push("/home");
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold">Set up your campus profile</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Hi {user.display_name} — pick your college, class, semester, and
          section so we can show classmate posts first.
        </p>
        {loadingDir ? (
          <LoadingInline label="Loading colleges…" />
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted)]">
                College
              </label>
              <select
                className="input"
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  setClassId("");
                  setSemesterId("");
                  setSectionId("");
                }}
                required
              >
                <option value="">Select college</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted)]">
                Class
              </label>
              <select
                className="input"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSemesterId("");
                  setSectionId("");
                }}
                required
                disabled={!collegeId}
              >
                <option value="">Select class</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {collegeId && filteredClasses.length === 0 && (
                <p className="mt-1 text-xs text-[var(--danger)]">
                  No classes for this college yet. Ask an admin to add them.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted)]">
                Semester
              </label>
              <select
                className="input"
                value={semesterId}
                onChange={(e) => {
                  setSemesterId(e.target.value);
                  setSectionId("");
                }}
                required
                disabled={!classId}
              >
                <option value="">Select semester</option>
                {filteredSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {classId && filteredSemesters.length === 0 && (
                <p className="mt-1 text-xs text-[var(--danger)]">
                  No semesters yet — ask an admin to add them for your class.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted)]">
                Section
              </label>
              <select
                className="input"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                required
                disabled={!semesterId}
              >
                <option value="">Select section</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {semesterId && filteredSections.length === 0 && (
                <p className="mt-1 text-xs text-[var(--danger)]">
                  No sections for this semester yet.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted)]">
                College ID / Enrollment no.
              </label>
              <input
                className="input"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                placeholder="e.g. UU24BCA0123"
                required
              />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Your student ID from college (roll / enrollment number). For
                United University we auto-import your photo from the university
                API when you continue.
              </p>
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <button
              className="btn btn-primary w-full"
              disabled={saving || loadingDir}
            >
              {saving ? "Saving…" : "Continue to feed"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
