"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function ForgotPasswordForm() {
  const { requestPasswordReset, confirmPasswordReset, demoMode } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const updateMode = search.get("mode") === "update";

  const [identifier, setIdentifier] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">(
    updateMode ? "reset" : "request"
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const res = await requestPasswordReset(identifier.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage(
      res.demoCode
        ? `${res.message || "Code sent"} (demo OTP: ${res.demoCode})`
        : res.message || "Check your email"
    );
    if (res.userId) setUserId(res.userId);
    if (identifier.includes("@")) setEmail(identifier.trim());
    setStep("reset");
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const res = await confirmPasswordReset({
      userId: userId || undefined,
      email: email || (identifier.includes("@") ? identifier.trim() : undefined),
      code,
      newPassword: password,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage(res.message || "Password updated");
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-[350px]">
        <div className="card px-8 py-10">
          <div className="mb-6 text-center">
            <Image
              src="/brand/unitians-logo.png"
              alt="Unitians"
              width={56}
              height={56}
              className="mx-auto object-contain"
              priority
            />
            <h1 className="mt-4 text-xl font-semibold">Reset password</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {step === "request"
                ? "We email a 6-digit OTP. Enter it next. If the mail only has a link, click it — it opens this page to set a new password (not a Vercel login)."
                : updateMode
                  ? "You are signed in via the email link. Choose a new password (OTP not needed)."
                  : "Enter the OTP from email and choose a new password."}
            </p>
          </div>

          {step === "request" ? (
            <form className="space-y-2" onSubmit={(e) => void onRequest(e)}>
              <input
                className="input bg-[#121212]"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or email"
                required
                autoComplete="username"
              />
              <button
                className="btn btn-primary mt-2 w-full"
                disabled={busy || !identifier.trim()}
              >
                {busy ? "Sending…" : "Send reset code"}
              </button>
            </form>
          ) : (
            <form className="space-y-2" onSubmit={(e) => void onReset(e)}>
              {demoMode || !updateMode ? (
                <input
                  className="input bg-[#121212]"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Reset OTP"
                  required={!updateMode}
                  inputMode="numeric"
                />
              ) : null}
              <input
                className="input bg-[#121212]"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                className="btn btn-primary mt-2 w-full"
                disabled={busy || password.length < 6}
              >
                {busy ? "Saving…" : "Update password"}
              </button>
              {!updateMode ? (
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  onClick={() => setStep("request")}
                >
                  Back
                </button>
              ) : null}
            </form>
          )}

          {error ? (
            <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
          ) : null}
          {message ? (
            <p className="mt-3 text-sm text-[var(--popular)]">{message}</p>
          ) : null}
        </div>

        <div className="card mt-3 px-8 py-5 text-center text-sm text-[var(--muted)]">
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-black text-sm text-[var(--muted)]">
          Loading…
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
