"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PostCard } from "@/components/feed/PostCard";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";

export default function FavouritesPage() {
  const { user, ready } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  const posts = useMemo(() => {
    if (!user) return [];
    const ids = new Set(
      catalog.favourites.filter((f) => f.user_id === user.id).map((f) => f.post_id)
    );
    return catalog.posts.filter((p) => ids.has(p.id));
  }, [catalog.favourites, catalog.posts, user]);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-6 md:px-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Favourites
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Starred PDFs / units saved for later
        </p>
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {posts.length === 0 && (
            <div className="card p-8 text-center text-[var(--muted)]">
              No favourites yet — tap the star on any post.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
