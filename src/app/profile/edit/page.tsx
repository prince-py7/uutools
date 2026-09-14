"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingInline } from "@/components/ui/Loading";
import { UploadTile } from "@/components/ui/UploadTile";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/config";
import { demoFileToDataUrl } from "@/lib/demo-store";
import { uploadToSupabase } from "@/lib/supabase/upload";
import type { ClassRow, College, Section, Socials } from "@/lib/types";

export default function EditProfilePage() {
  const { user, ready, updateProfile, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [socials, setSocials] = useState<Socials>({});
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [formError, setFormError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [loadingDir, setLoadingDir] = useState(true);
  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    setDisplayName(user.display_name);
    setBio(user.bio);
    setAvatarUrl(user.avatar_url || "");
    setEnrollmentId(user.enrollment_id || "");
    setCollegeId(user.college_id || "");
    setClassId(user.class_id || "");
    setSectionId(user.section_id || "");
    setSocials(user.socials || {});
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user) return;
    if (demoMode || !isSupabaseConfigured()) {
      setColleges(catalog.colleges.filter((c) => c.is_active));
      setClasses(catalog.classes);
      setSections(catalog.sections);
      setLoadingDir(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadingDir(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const [colRes, classRes, secRes] = await Promise.all([
          supabase.from("colleges").select("*").eq("is_active", true).order("name"),
          supabase.from("classes").select("*").order("name"),
          supabase.from("sections").select("*").order("name"),
        ]);
        if (cancelled) return;
        setColleges((colRes.data as College[]) || []);
        setClasses((classRes.data as ClassRow[]) || []);
        setSections((secRes.data as Section[]) || []);
      } catch {
        if (!cancelled) toast.error("Could not load colleges");
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
  const filteredSections = useMemo(
    () => sections.filter((s) => s.class_id === classId),
    [sections, classId]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!collegeId || !classId || !sectionId) {
      setFormError("Select college, class, and section");
      return;
    }
    setSaving(true);
    setFormError("");
    setStatusNote("Saving…");
    const updated = await updateProfile({
      display_name: displayName.trim() || user.username,
      bio,
      avatar_url: avatarUrl || null,
      enrollment_id: enrollmentId.trim() || null,
      college_id: collegeId,
      class_id: classId,
      section_id: sectionId,
      socials,
    });
    setSaving(false);
    if (!updated) {
      setStatusNote("");
      setFormError("Could not update profile. Try again.");
      toast.error("Profile update failed");
      return;
    }
    setStatusNote("Profile updated");
    toast.success("Profile updated");
    setTimeout(() => {
      router.push(`/profile/${user.username}`);
    }, 700);
  }

  async function onAvatarChange(file: File | undefined) {
    if (!file || !user) return;
    setAvatarError("");
    if (demoMode) {
      const res = await demoFileToDataUrl(file, "avatar");
      if ("error" in res) {
        setAvatarError(res.error);
        return;
      }
      setAvatarUrl(res.url);
      return;
    }
    const res = await uploadToSupabase(file, "avatar", user.id);
    if ("error" in res) {
      setAvatarError(res.error);
      toast.error(res.error);
      return;
    }
    setAvatarUrl(res.url);
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-4 md:px-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Edit profile</h1>
          <Link href="/profile/settings" className="text-sm text-[var(--accent)]">
            Account settings
          </Link>
        </div>

        <form className="card space-y-4 p-5" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">
              Display name
            </label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
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
            />
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <h2 className="mb-3 text-sm font-semibold">Campus</h2>
            {loadingDir ? (
              <LoadingInline label="Loading colleges…" />
            ) : (
              <div className="space-y-3">
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
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Bio</label>
            <textarea
              className="input min-h-[80px] py-3"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">
              Avatar
            </label>
            <UploadTile
              accept="image/jpeg,image/png,image/webp,image/gif"
              onPick={(f) => void onAvatarChange(f)}
              previewUrl={avatarUrl || null}
              label="Photo"
              size={96}
            />
            {avatarError ? (
              <p className="mt-2 text-xs text-[var(--danger)]">{avatarError}</p>
            ) : null}
          </div>

          {(["instagram", "linkedin", "github", "website"] as const).map(
            (key) => (
              <div key={key}>
                <label className="mb-1.5 block text-sm capitalize text-[var(--muted)]">
                  {key}
                </label>
                <input
                  className="input"
                  value={socials[key] || ""}
                  onChange={(e) =>
                    setSocials((s) => ({ ...s, [key]: e.target.value }))
                  }
                  placeholder={`https://${key}.com/...`}
                />
              </div>
            )
          )}

          {statusNote ? (
            <p className="text-sm text-[var(--popular)]">{statusNote}</p>
          ) : null}
          {formError ? (
            <p className="text-sm text-[var(--danger)]">{formError}</p>
          ) : null}
          <button
            className="btn btn-primary w-full"
            type="submit"
            disabled={saving || loadingDir}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
