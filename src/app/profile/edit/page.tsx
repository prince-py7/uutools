"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingInline } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/config";
import { demoFileToDataUrl } from "@/lib/demo-store";
import { uploadToSupabase } from "@/lib/supabase/upload";
import type { ClassRow, College, Section, Socials } from "@/lib/types";

export default function EditProfilePage() {
  const { user, ready, updateProfile, requestEmailVerification, confirmEmailOtp, changePassword, demoMode } =
    useAuth();
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
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
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

  async function onVerifyEmail() {
    setVerifying(true);
    setVerifyMsg("");
    setVerifyError("");
    const res = await requestEmailVerification();
    setVerifying(false);
    if (res.error) setVerifyError(res.error);
    else {
      setVerifyMsg(
        res.demoCode
          ? `${res.message || "OTP sent"} (demo code: ${res.demoCode})`
          : res.message || "OTP sent to your email"
      );
    }
  }

  async function onConfirmOtp(e: FormEvent) {
    e.preventDefault();
    setOtpBusy(true);
    setVerifyError("");
    setVerifyMsg("");
    const res = await confirmEmailOtp(otp);
    setOtpBusy(false);
    if (res.error) setVerifyError(res.error);
    else {
      setVerifyMsg(res.message || "Email verified");
      setOtp("");
      toast.success("Email verified");
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordError("");
    setPasswordMsg("");
    const res = await changePassword(currentPassword, newPassword);
    setPasswordBusy(false);
    if (res.error) setPasswordError(res.error);
    else {
      setPasswordMsg(res.message || "Password updated");
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    }
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
        <h1 className="text-2xl font-bold">Edit profile</h1>

        <section className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold">Account</h2>
          <div className="text-sm">
            <p className="text-[var(--muted)]">Username</p>
            <p className="font-medium">@{user.username}</p>
          </div>
          <div className="text-sm">
            <p className="text-[var(--muted)]">Email</p>
            <p className="font-medium">{user.email}</p>
            <p className="mt-1 text-xs">
              {user.email_verified ? (
                <span className="text-[var(--popular)]">Verified</span>
              ) : (
                <span className="text-[var(--muted)]">Not verified</span>
              )}
            </p>
          </div>
          {!user.email_verified ? (
            <div className="space-y-2">
              <button
                type="button"
                className="btn btn-ghost w-full"
                disabled={verifying}
                onClick={() => void onVerifyEmail()}
              >
                {verifying ? "Sending OTP…" : "Send verification OTP"}
              </button>
              <form className="flex gap-2" onSubmit={(e) => void onConfirmOtp(e)}>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={8}
                  required
                />
                <button
                  className="btn btn-primary shrink-0"
                  disabled={otpBusy || otp.trim().length < 4}
                >
                  {otpBusy ? "…" : "Verify"}
                </button>
              </form>
            </div>
          ) : null}
          {verifyMsg ? (
            <p className="text-xs text-[var(--popular)]">{verifyMsg}</p>
          ) : null}
          {verifyError ? (
            <p className="text-xs text-[var(--danger)]">{verifyError}</p>
          ) : null}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold">Change password</h2>
          {!user.email_verified ? (
            <p className="text-xs text-[var(--muted)]">
              Verify your email first, then you can change your password.
            </p>
          ) : (
            <form className="space-y-2" onSubmit={(e) => void onChangePassword(e)}>
              <input
                className="input"
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button className="btn btn-primary w-full" disabled={passwordBusy}>
                {passwordBusy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
          {passwordMsg ? (
            <p className="text-xs text-[var(--popular)]">{passwordMsg}</p>
          ) : null}
          {passwordError ? (
            <p className="text-xs text-[var(--danger)]">{passwordError}</p>
          ) : null}
          {user.is_admin ? (
            <p className="text-xs text-[var(--muted)]">
              Admin panel: open <Link href="/admin" className="text-[var(--accent)]">/admin</Link>{" "}
              from the side menu (Admin).
            </p>
          ) : null}
        </section>

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
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mb-2 block w-full text-sm"
              onChange={(e) => void onAvatarChange(e.target.files?.[0])}
            />
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="mb-2 h-16 w-16 rounded-full object-cover"
              />
            ) : null}
            {avatarError ? (
              <p className="text-xs text-[var(--danger)]">{avatarError}</p>
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
