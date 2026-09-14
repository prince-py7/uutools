"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import { enablePushNotifications, pushSupported } from "@/lib/push";
import {
  getPushEnabledPref,
  setPushEnabledPref,
} from "@/lib/push-prefs";

export default function ProfileSettingsPage() {
  const {
    user,
    ready,
    requestEmailVerification,
    confirmEmailOtp,
    changePassword,
  } = useAuth();
  const router = useRouter();
  const toast = useToast();

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
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [ready, user, router]);

  useEffect(() => {
    setPushOn(getPushEnabledPref());
  }, []);

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

  async function onTogglePush(next: boolean) {
    setPushError("");
    if (!next) {
      setPushEnabledPref(false);
      setPushOn(false);
      return;
    }
    if (!user) return;
    if (!pushSupported()) {
      setPushError("Push notifications are not supported in this browser");
      return;
    }
    setPushBusy(true);
    const res = await enablePushNotifications(user.id);
    setPushBusy(false);
    if (!res.ok) {
      setPushError(res.error || "Could not enable alerts");
      toast.error(res.error || "Could not enable alerts");
      return;
    }
    setPushEnabledPref(true);
    setPushOn(true);
    toast.success("Phone alerts enabled");
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-4 md:px-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Settings</h1>
          <Link href={`/profile/${user.username}`} className="text-sm text-[var(--accent)]">
            Back to profile
          </Link>
        </div>

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
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold">Phone alerts</h2>
          <p className="text-xs text-[var(--muted)]">
            Class announcements and important updates on this device.
          </p>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Enable phone alerts</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={pushOn}
              disabled={pushBusy}
              onChange={(e) => void onTogglePush(e.target.checked)}
            />
          </label>
          {pushError ? (
            <p className="text-xs text-[var(--danger)]">{pushError}</p>
          ) : null}
        </section>

        {user.is_admin ? (
          <section className="card space-y-2 p-5">
            <h2 className="text-sm font-semibold">Admin</h2>
            <p className="text-xs text-[var(--muted)]">
              Admin panel is at{" "}
              <Link href="/admin" className="text-[var(--accent)]">
                /admin
              </Link>
              . It appears in the side menu when your profile has{" "}
              <code className="text-[var(--text)]">is_admin</code> set.
            </p>
            <p className="text-xs text-[var(--muted)]">
              To become admin, run in Supabase SQL:{" "}
              <code className="block break-all rounded bg-[#141414] p-2 text-[11px] text-[var(--text)]">
                {`update profiles set is_admin = true where username = 'yourname';`}
              </code>{" "}
              then open{" "}
              <Link href="/admin" className="text-[var(--accent)]">
                /admin
              </Link>
              .
            </p>
          </section>
        ) : null}

        <p className="px-1 text-sm text-[var(--muted)]">
          Profile photo, bio, and campus fields:{" "}
          <Link href="/profile/edit" className="text-[var(--accent)]">
            Edit profile
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
