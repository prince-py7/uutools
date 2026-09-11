"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login, demoMode } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
              Sign in with username or email
            </p>
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
              disabled={loading || !identifier || !password}
            >
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>

          {demoMode && (
            <div className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
              <p className="mb-1 font-medium text-[var(--text)]">Demo</p>
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
