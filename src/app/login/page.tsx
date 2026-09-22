"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.7.5-2.3 1.8C5.3 19.5 8.4 21.4 12 21.4c2.4 0 4.4-.8 5.9-2.1l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.5z"
      />
      <path
        fill="#4A90E2"
        d="M3.6 7.4C2.9 8.8 2.6 10.3 2.6 12s.3 3.2 1 4.6l3-2.3c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9l-3-2.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.2c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.4 2.5 14.4 1.6 12 1.6 8.4 1.6 5.3 3.5 3.6 6.6l3 2.3C7.9 6.7 9.8 5.2 12 5.2z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { login, loginWithGoogle, demoMode } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(identifier.trim(), password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push("/home");
  }

  async function onGoogle() {
    setGoogleBusy(true);
    setError("");
    const res = await loginWithGoogle();
    if (res.error) {
      setError(res.error);
      setGoogleBusy(false);
    }
    // On success Supabase redirects away
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-[350px]">
        <div className="card px-8 py-10">
          <div className="mb-8 text-center">
            <Image
              src="/brand/unitians-logo.png"
              alt="Unitians"
              width={64}
              height={64}
              className="mx-auto object-contain"
              priority
            />
            <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-white">
              Unitians
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Sign in with Google, username, or email
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost mb-4 flex w-full items-center justify-center gap-2 border border-[var(--line)] bg-white text-black hover:bg-[#f2f2f2]"
            disabled={googleBusy || loading}
            onClick={() => void onGoogle()}
          >
            <GoogleIcon />
            {googleBusy ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-[var(--muted)]">
            <span className="h-px flex-1 bg-[var(--line)]" />
            or
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <form className="space-y-2" onSubmit={onSubmit}>
            <input
              className="input bg-[#121212]"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username or email"
              required
              autoComplete="username"
            />
            <input
              className="input bg-[#121212]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
            />
            {error && <p className="pt-1 text-sm text-[var(--danger)]">{error}</p>}
            <button
              className="btn btn-primary mt-2 w-full"
              disabled={loading || googleBusy || !identifier || !password}
            >
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>

          <p className="mt-3 text-center text-sm">
            <Link href="/forgot-password" className="text-[var(--accent)]">
              Forgot password?
            </Link>
          </p>

          {demoMode && (
            <div className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
              <p className="mb-1 font-medium text-[var(--text)]">Try demo login</p>
              <p>aarav / password</p>
              <p>riya_cr / password</p>
              <p>admin / admin123</p>
            </div>
          )}
        </div>

        <div className="card mt-3 px-8 py-5 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[var(--accent)]">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
