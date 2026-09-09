"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login, demoMode } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(username.trim(), password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push("/home");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">
            UU <span className="text-[var(--accent)]">Community</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sign in to your campus feed
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        {demoMode && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] p-3 text-xs text-[var(--muted)]">
            <p className="mb-1 font-semibold text-[var(--text)]">Demo accounts</p>
            <p>aarav / password — student</p>
            <p>riya_cr / password — CR</p>
            <p>admin / admin123 — developer</p>
          </div>
        )}

        {!demoMode && (
          <GoogleButton />
        )}

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-[var(--accent)]">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleButton() {
  return (
    <button
      type="button"
      className="btn btn-ghost mt-4 w-full"
      onClick={async () => {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      }}
    >
      Continue with Google
    </button>
  );
}
