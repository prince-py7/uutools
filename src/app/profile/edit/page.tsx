"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { demoFileToDataUrl } from "@/lib/demo-store";
import { uploadToSupabase } from "@/lib/supabase/upload";
import type { Socials } from "@/lib/types";

export default function EditProfilePage() {
  const { user, ready, updateProfile, requestEmailVerification, demoMode } =
    useAuth();
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [socials, setSocials] = useState<Socials>({});
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [formError, setFormError] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [avatarError, setAvatarError] = useState("");

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
    setSocials(user.socials || {});
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setFormError("");
    setStatusNote("Updating profile…");
    const updated = await updateProfile({
      display_name: displayName.trim() || user.username,
      bio,
      avatar_url: avatarUrl || null,
      enrollment_id: enrollmentId.trim() || null,
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
    else setVerifyMsg(res.message || "Done");
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
      <div className="mx-auto max-w-xl px-3 py-4 md:px-0">
        <h1 className="mb-4 text-2xl font-bold">Edit profile</h1>

        <section className="card mb-4 space-y-3 p-5">
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
          {!user.email_verified && (
            <button
              type="button"
              className="btn btn-ghost w-full"
              disabled={verifying}
              onClick={() => void onVerifyEmail()}
            >
              {verifying
                ? "Sending…"
                : demoMode
                  ? "Verify email (demo)"
                  : "Send verification email"}
            </button>
          )}
          {verifyMsg && (
            <p className="text-xs text-[var(--popular)]">{verifyMsg}</p>
          )}
          {verifyError && (
            <p className="text-xs text-[var(--danger)]">{verifyError}</p>
          )}
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
            <p className="mt-1 text-xs text-[var(--muted)]">
              Your student / college ID card number (not the college dropdown).
            </p>
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
              Avatar (jpeg/png/webp/gif, max 2 MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="mb-2 block w-full text-sm"
              onChange={(e) => void onAvatarChange(e.target.files?.[0])}
            />
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="mb-2 h-16 w-16 rounded-full object-cover"
              />
            )}
            {avatarError && (
              <p className="text-xs text-[var(--danger)]">{avatarError}</p>
            )}
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
          {statusNote && (
            <p className="text-sm text-[var(--popular)]">{statusNote}</p>
          )}
          {formError && (
            <p className="text-sm text-[var(--danger)]">{formError}</p>
          )}
          <button className="btn btn-primary w-full" type="submit" disabled={saving}>
            {saving ? "Updating profile…" : "Save changes"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
