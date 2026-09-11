"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";

export default function OnboardingPage() {
  const { user, ready, updateProfile, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const [collegeId, setCollegeId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.onboarding_complete) router.replace("/home");
  }, [ready, user, router]);

  const colleges = demoMode
    ? catalog.colleges.filter((c) => c.is_active)
    : catalog.colleges;
  const classes = useMemo(
    () => catalog.classes.filter((c) => c.college_id === collegeId),
    [catalog.classes, collegeId]
  );
  const sections = useMemo(
    () => catalog.sections.filter((s) => s.class_id === classId),
    [catalog.sections, classId]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collegeId || !classId || !sectionId) {
      setError("Select college, class, and section");
      return;
    }
    await updateProfile({
      college_id: collegeId,
      class_id: classId,
      section_id: sectionId,
      onboarding_complete: true,
    });
    router.push("/home");
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold">
          Set up your campus profile
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Hi {user.display_name} — pick your college and class so we can show classmate posts first.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">College</label>
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
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Class</label>
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
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Section</label>
            <select
              className="input"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              required
              disabled={!classId}
            >
              <option value="">Select section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button className="btn btn-primary w-full">Continue to feed</button>
        </form>
      </div>
    </div>
  );
}
