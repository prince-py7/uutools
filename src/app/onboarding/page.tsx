"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/config";
import type { ClassRow, College, Section } from "@/lib/types";

export default function OnboardingPage() {
  const { user, ready, updateProfile, demoMode } = useAuth();
  const demoCatalog = useDemoCatalog();
  const router = useRouter();
  const [collegeId, setCollegeId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingDir, setLoadingDir] = useState(!demoMode);
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
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
        const [colRes, classRes, secRes] = await Promise.all([
          supabase.from("colleges").select("*").eq("is_active", true).order("name"),
          supabase.from("classes").select("*").order("name"),
          supabase.from("sections").select("*").order("name"),
        ]);
        if (cancelled) return;
        if (colRes.error) throw new Error(colRes.error.message);
        if (classRes.error) throw new Error(classRes.error.message);
        if (secRes.error) throw new Error(secRes.error.message);
        setColleges((colRes.data as College[]) || []);
        setClasses((classRes.data as ClassRow[]) || []);
        setSections((secRes.data as Section[]) || []);
        if (!(colRes.data || []).length) {
          setError(
            "No colleges in database yet. Run supabase/seed_uu.sql in Supabase SQL Editor."
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load colleges");
        }
      } finally {
        if (!cancelled) setLoadingDir(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // demoCatalog is stable enough for demoMode branch only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, demoMode]);

  const filteredClasses = useMemo(
    () => classes.filter((c) => c.college_id === collegeId),
    [classes, collegeId]
  );
  const filteredSections = useMemo(
    () => sections.filter((s) => s.class_id === classId),
    [sections, classId]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collegeId || !classId || !sectionId) {
      setError("Select college, class, and section");
      return;
    }
    setSaving(true);
    setError("");
    const updated = await updateProfile({
      college_id: collegeId,
      class_id: classId,
      section_id: sectionId,
      onboarding_complete: true,
    });
    setSaving(false);
    if (!updated) {
      setError(
        "Could not save profile. Make sure schema.sql is applied and class/section IDs exist in Supabase."
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
          Hi {user.display_name} — pick your college and class so we can show
          classmate posts first.
        </p>
        {loadingDir ? (
          <p className="mt-6 text-sm text-[var(--muted)]">Loading colleges…</p>
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
                  No classes for this college. Run seed_uu.sql or add classes in
                  Admin.
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
                disabled={!classId}
              >
                <option value="">Select section</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
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
