"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signup({
      username: username.trim(),
      password,
      displayName: displayName.trim() || username.trim(),
    });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <Image
            src="/brand/unitians-logo.png"
            alt="UNITIANS"
            width={80}
            height={80}
            className="mx-auto object-contain drop-shadow-[0_0_24px_rgba(77,232,255,0.4)]"
            priority
          />
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[0.1em]">
            Join UNITIANS
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Username + password</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Display name</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="unique_username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
