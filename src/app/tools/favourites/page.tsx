"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PostCard } from "@/components/feed/PostCard";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { fetchMyFavourites, type FavouriteFeedItem } from "@/lib/favourites";
import {
  fetchCollegeClasses,
  fetchPopularThreshold,
  fetchClassRolesForUsers,
} from "@/lib/directory";
import { createClient } from "@/lib/supabase/client";
import type { ClassRole, ClassRow, Section } from "@/lib/types";

export default function FavouritesPage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<FavouriteFeedItem[]>([]);
  const [roles, setRoles] = useState<ClassRole[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [threshold, setThreshold] = useState(catalog.popularThreshold);
  const [loading, setLoading] = useState(!demoMode);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      const ids = new Set(
        catalog.favourites
          .filter((f) => f.user_id === user.id)
          .map((f) => f.post_id)
      );
      const posts = catalog.posts.filter((p) => ids.has(p.id));
      setItems(
        posts.map((post) => ({
          post,
          author:
            catalog.profiles.find((p) => p.id === post.author_id) ||
            catalog.profiles[0],
          liked: catalog.likes.some(
            (l) => l.user_id === user.id && l.post_id === post.id
          ),
          favoured: true,
          comments: catalog.comments.filter((c) => c.post_id === post.id),
        })).filter((i) => i.author)
      );
      setRoles(catalog.roles);
      setClasses(catalog.classes);
      setSections(catalog.sections);
      setThreshold(catalog.popularThreshold);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const favs = await fetchMyFavourites(user.id);
      if (cancelled) return;
      if (favs.error) toast.error(favs.error);
      setItems(favs.items);
      const authorIds = [...new Set(favs.items.map((i) => i.author.id))];
      const [thr, roleRows, classRows] = await Promise.all([
        fetchPopularThreshold(),
        fetchClassRolesForUsers(authorIds),
        user.college_id
          ? fetchCollegeClasses(user.college_id)
          : Promise.resolve([] as ClassRow[]),
      ]);
      if (cancelled) return;
      setThreshold(thr);
      setRoles(roleRows);
      setClasses(classRows);
      if (classRows.length) {
        const supabase = createClient();
        const { data } = await supabase
          .from("sections")
          .select("*")
          .in(
            "class_id",
            classRows.map((c) => c.id)
          );
        if (!cancelled) setSections((data as Section[]) || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, demoMode, catalog, toast]);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-6 md:px-0">
        <h1 className="text-2xl font-bold">Favourites</h1>
        <p className="text-sm text-[var(--muted)]">
          Starred PDFs / units saved for later
        </p>
        <div className="space-y-4">
          {loading && (
            <p className="text-sm text-[var(--muted)]">Loading favourites…</p>
          )}
          {!loading &&
            items.map((item) => (
              <PostCard
                key={item.post.id}
                post={item.post}
                author={item.author}
                initialLiked={item.liked}
                initialFavoured={item.favoured}
                initialComments={item.comments}
                roles={roles}
                classes={classes}
                sections={sections}
                popularThreshold={threshold}
              />
            ))}
          {!loading && items.length === 0 && (
            <div className="card p-8 text-center text-[var(--muted)]">
              No favourites yet — tap the star on any post.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
