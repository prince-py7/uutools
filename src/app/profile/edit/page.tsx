"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth-context";
import type { Socials } from "@/lib/types";

export default function EditProfilePage() {
  const { user, ready, updateProfile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [socials, setSocials] = useState<Socials>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    setDisplayName(user.display_name);
    setBio(user.bio);
    setAvatarUrl(user.avatar_url || "");
    setSocials(user.socials || {});
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await updateProfile({
      display_name: displayName,
      bio,
      avatar_url: avatarUrl || null,
      socials,
    });
    setSaved(true);
    setTimeout(() => {
      if (user) router.push(`/profile/${user.username}`);
    }, 500);
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-3 py-4 md:px-0">
        <h1 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-bold">
          Edit profile
        </h1>
        <form className="card space-y-4 p-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted)]">Display name</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
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
              Avatar URL (upload via Supabase Storage when connected)
            </label>
            <input
              className="input"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {(["instagram", "linkedin", "github", "website"] as const).map((key) => (
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
          ))}
          <button className="btn btn-primary w-full" type="submit">
            {saved ? "Saved" : "Save changes"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
