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
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-[350px]">
        <div className="card px-8 py-10">
          <div className="mb-8 text-center">
            <Image
              src="/brand/unitians-logo.png"
              alt="Unitians"
              width={56}
              height={56}
              className="mx-auto object-contain"
              priority
            />
            <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-white">Unitians</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Create your campus account
            </p>
          </div>
          <form className="space-y-2" onSubmit={onSubmit}>
            <input
              className="input bg-[#121212]"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
            />
            <input
              className="input bg-[#121212]"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="Username"
              required
            />
            <input
              className="input bg-[#121212]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              minLength={6}
              required
            />
            {error && <p className="pt-1 text-sm text-[var(--danger)]">{error}</p>}
            <button className="btn btn-primary mt-2 w-full" disabled={loading}>
              {loading ? "Creating…" : "Sign up"}
            </button>
          </form>
        </div>
        <div className="card mt-3 px-8 py-5 text-center text-sm text-[var(--muted)]">
          Have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
