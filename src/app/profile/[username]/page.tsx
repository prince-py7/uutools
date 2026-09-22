"use client";

import { LoadingInline, LoadingState, SkeletonRows, Spinner } from "@/components/ui/Loading";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar, BadgeList } from "@/components/ui/Badge";
import { PostCard } from "@/components/feed/PostCard";
import { SendFriendButton } from "@/components/social/FriendRequests";
import { buildBadges, classSectionLabel } from "@/lib/badges";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/config";
import { FEED_PAGE_SIZE, fetchProfilePosts, type FeedItem } from "@/lib/feed";
import type {
  ClassRole,
  RoleDefinition,
  ClassRow,
  College,
  Post,
  Profile,
  Section,
} from "@/lib/types";

type ProfileHeader = {
  profile: Profile;
  college: College | null;
  classRow: ClassRow | null;
  section: Section | null;
  roles: ClassRole[];
  roleDefinitions: RoleDefinition[];
  popularThreshold: number;
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username || "");
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();

  const [header, setHeader] = useState<ProfileHeader | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [error, setError] = useState("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [liveItems, setLiveItems] = useState<FeedItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [demoVisible, setDemoVisible] = useState(FEED_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  // ─── Phase 1: profile header only ──────────────────────────────────────────
  useEffect(() => {
    if (!ready || !user || !username) return;

    let cancelled = false;

    async function loadHeader() {
      setHeaderLoading(true);
      setError("");
      setHeader(null);
      setPosts([]);
      setLiveItems([]);
      setCursor(null);
      setHasMore(true);
      setDemoVisible(FEED_PAGE_SIZE);

      if (demoMode || !isSupabaseConfigured()) {
        let profile = catalog.profiles.find((p) => {
          if (p.username.toLowerCase() !== username.toLowerCase()) return false;
          if (p.id === user!.id) return true;
          if (user!.is_admin) return true;
          return Boolean(user!.college_id && p.college_id === user!.college_id);
        });
        if (cancelled) return;
        if (!profile) {
          if (user!.username.toLowerCase() === username.toLowerCase()) {
            profile = user!;
          } else {
            setHeader(null);
            setError("User not found");
            setHeaderLoading(false);
            return;
          }
        }
        setHeader({
          profile,
          college:
            catalog.colleges.find((c) => c.id === profile.college_id) || null,
          classRow:
            catalog.classes.find((c) => c.id === profile.class_id) || null,
          section:
            catalog.sections.find((s) => s.id === profile.section_id) || null,
          roles: catalog.roles.filter((r) => r.user_id === profile.id),
          roleDefinitions: catalog.roleDefinitions || [],
          popularThreshold: catalog.popularThreshold,
        });
        setHeaderLoading(false);
        return;
      }

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const uname = username.toLowerCase();
        const profileQuery = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", uname)
          .maybeSingle();

        if (profileQuery.error) throw new Error(profileQuery.error.message);
        let profile = profileQuery.data;

        if (
          !profile &&
          user!.username &&
          user!.username.toLowerCase() === uname
        ) {
          profile = user!;
        }

        if (!profile) {
          if (!cancelled) {
            setHeader(null);
            setError("User not found");
            setHeaderLoading(false);
          }
          return;
        }

        const p = profile as Profile;
        const allowed =
          p.id === user!.id ||
          user!.is_admin ||
          Boolean(user!.college_id && p.college_id === user!.college_id);

        if (!allowed) {
          if (!cancelled) {
            setHeader(null);
            setError("User not found");
            setHeaderLoading(false);
          }
          return;
        }

        const [collegeRes, classRes, sectionRes, rolesRes, roleDefsRes, settingsRes] =
          await Promise.all([
            p.college_id
              ? supabase
                  .from("colleges")
                  .select("*")
                  .eq("id", p.college_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            p.class_id
              ? supabase
                  .from("classes")
                  .select("*")
                  .eq("id", p.class_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            p.section_id
              ? supabase
                  .from("sections")
                  .select("*")
                  .eq("id", p.section_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            supabase.from("class_roles").select("*").eq("user_id", p.id),
            p.college_id
              ? supabase
                  .from("role_definitions")
                  .select("*")
                  .eq("college_id", p.college_id)
              : Promise.resolve({ data: [] }),
            supabase
              .from("app_settings")
              .select("value")
              .eq("key", "popular_like_threshold")
              .maybeSingle(),
          ]);

        if (cancelled) return;

        const thresholdRaw = (
          settingsRes as { data?: { value?: unknown } | null }
        ).data?.value;
        const popularThreshold =
          typeof thresholdRaw === "number"
            ? thresholdRaw
            : Number(thresholdRaw) || catalog.popularThreshold || 10;

        setHeader({
          profile: {
            ...p,
            socials: p.socials || {},
          },
          college: (collegeRes.data as College) || null,
          classRow: (classRes.data as ClassRow) || null,
          section: (sectionRes.data as Section) || null,
          roles: (rolesRes.data as ClassRole[]) || [],
          roleDefinitions: (roleDefsRes.data as RoleDefinition[]) || [],
          popularThreshold,
        });
      } catch (e) {
        if (!cancelled) {
          setHeader(null);
          setError(e instanceof Error ? e.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setHeaderLoading(false);
      }
    }

    void loadHeader();
    return () => {
      cancelled = true;
    };
  }, [ready, user, username, demoMode, catalog]);

  // ─── Phase 2: posts after header ───────────────────────────────────────────
  const loadPosts = useCallback(
    async (mode: "reset" | "more") => {
      if (!header?.profile || !user) return;

      if (demoMode || !isSupabaseConfigured()) {
        const all = catalog.posts
          .filter((p) => p.author_id === header.profile.id)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
        setPosts(all);
        setHasMore(false);
        setPostsLoading(false);
        return;
      }

      if (mode === "more") {
        if (loadingMore || !hasMore || !cursor) return;
        setLoadingMore(true);
      } else {
        setPostsLoading(true);
        setCursor(null);
        setHasMore(true);
      }

      const res = await fetchProfilePosts({
        authorId: header.profile.id,
        viewerId: user.id,
        before: mode === "more" ? cursor : null,
        limit: FEED_PAGE_SIZE,
      });

      if (mode === "reset") {
        setLiveItems(res.items);
        setPosts(res.items.map((i) => i.post));
      } else {
        setLiveItems((prev) => {
          const seen = new Set(prev.map((i) => i.post.id));
          return [...prev, ...res.items.filter((i) => !seen.has(i.post.id))];
        });
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [
            ...prev,
            ...res.items
              .map((i) => i.post)
              .filter((p) => !seen.has(p.id)),
          ];
        });
      }
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
      setPostsLoading(false);
      setLoadingMore(false);
    },
    [
      header?.profile,
      user,
      demoMode,
      catalog.posts,
      cursor,
      hasMore,
      loadingMore,
    ]
  );

  useEffect(() => {
    if (!header?.profile) return;
    void loadPosts("reset");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header?.profile?.id]);

  const demoShown = useMemo(
    () => posts.slice(0, demoVisible),
    [posts, demoVisible]
  );
  const demoHasMore = demoMode && demoVisible < posts.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || headerLoading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (demoMode) {
          if (demoHasMore) setDemoVisible((n) => n + FEED_PAGE_SIZE);
          return;
        }
        void loadPosts("more");
      },
      { rootMargin: "320px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [demoMode, demoHasMore, loadPosts, headerLoading, posts.length]);

  const badges = useMemo(() => {
    if (!header) return [];
    return buildBadges({
      profile: header.profile,
      roles: header.roles,
      classes: header.classRow ? [header.classRow] : [],
      sections: header.section ? [header.section] : [],
      popularThreshold: header.popularThreshold,
      roleDefinitions: header.roleDefinitions,
    });
  }, [header]);

  if (!user) return null;

  if (headerLoading) {
    return (
      <AppShell>
        <LoadingState label="Loading profile…" />
      </AppShell>
    );
  }

  if (!header?.profile) {
    return (
      <AppShell>
        <div className="card m-4 space-y-3 p-8 text-center">
          <p className="font-semibold">User not found</p>
          {error && <p className="text-sm text-[var(--muted)]">{error}</p>}
          <Link href="/home" className="btn btn-ghost mt-2 inline-flex">
            Back to home
          </Link>
        </div>
      </AppShell>
    );
  }

  const { profile, college, classRow, section } = header;
  const isSelf = user.id === profile.id;
  const displayPosts = demoMode ? demoShown : posts;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-4 md:px-0">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <Avatar
              name={profile.display_name || profile.username}
              url={profile.avatar_url}
              size={72}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">
                  {profile.display_name || profile.username}
                </h1>
                {isSelf ? (
                  <Link
                    href="/profile/settings"
                    className="icon-btn text-[var(--muted)] hover:text-white"
                    aria-label="Settings"
                    title="Settings"
                  >
                    <Settings size={18} />
                  </Link>
                ) : null}
                <BadgeList badges={badges} />
              </div>
              <p className="text-[var(--muted)]">@{profile.username}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {college?.name ||
                  (isSelf ? "Finish onboarding to set college" : "—")}
                {classRow
                  ? ` · ${classSectionLabel(classRow, section || undefined)}`
                  : ""}
              </p>
              {profile.enrollment_id && (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  College ID: {profile.enrollment_id}
                </p>
              )}
              {!profile.enrollment_id && isSelf && (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  No College ID yet — add it in Edit profile.
                </p>
              )}
              {profile.bio ? (
                <p className="mt-3 whitespace-pre-wrap text-sm">{profile.bio}</p>
              ) : (
                isSelf && (
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    No bio yet — add one in Edit profile.
                  </p>
                )
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--accent)]">
                {profile.socials?.instagram && (
                  <a
                    href={profile.socials.instagram}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Instagram
                  </a>
                )}
                {profile.socials?.linkedin && (
                  <a
                    href={profile.socials.linkedin}
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn
                  </a>
                )}
                {profile.socials?.github && (
                  <a
                    href={profile.socials.github}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                )}
                {profile.socials?.website && (
                  <a
                    href={profile.socials.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Website
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {isSelf ? (
                  <>
                    <Link
                      href="/profile/edit"
                      className="btn btn-ghost inline-flex"
                    >
                      Edit profile
                    </Link>
                    <Link href="/messages" className="btn btn-ghost inline-flex">
                      Messages
                    </Link>
                  </>
                ) : (
                  <SendFriendButton targetUserId={profile.id} />
                )}
              </div>
            </div>
          </div>
        </div>

        <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">
          Posts
          {!postsLoading && displayPosts.length
            ? ` · ${displayPosts.length}${hasMore || demoHasMore ? "+" : ""}`
            : ""}
        </h2>
        <div className="space-y-4 pb-4">
          {postsLoading && displayPosts.length === 0 ? (
            <SkeletonRows rows={2} />
          ) : displayPosts.length === 0 ? (
            <div className="card p-6 text-center text-[var(--muted)]">
              No posts yet
            </div>
          ) : demoMode ? (
            demoShown.map((p) => (
              <PostCard key={p.id} post={p} author={profile} />
            ))
          ) : (
            liveItems.map((item) => (
              <PostCard
                key={item.post.id}
                post={item.post}
                author={profile}
                initialLiked={item.liked}
                initialFavoured={item.favoured}
                initialComments={item.comments}
                people={item.people}
                popularThreshold={header.popularThreshold}
              />
            ))
          )}

          <div ref={sentinelRef} className="h-6" aria-hidden />
          {(loadingMore || postsLoading) && displayPosts.length > 0 ? (
            <div className="flex justify-center py-2">
              <Spinner size={18} />
            </div>
          ) : null}
          {postsLoading && displayPosts.length === 0 ? (
            <LoadingInline label="Loading posts…" />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
