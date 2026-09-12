"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar, BadgeList } from "@/components/ui/Badge";
import { PostCard } from "@/components/feed/PostCard";
import { SendFriendButton } from "@/components/social/FriendRequests";
import { buildBadges, classSectionLabel } from "@/lib/badges";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/config";
import type {
  ClassRole,
  ClassRow,
  College,
  Post,
  Profile,
  Section,
} from "@/lib/types";

type ProfileBundle = {
  profile: Profile;
  college: College | null;
  classRow: ClassRow | null;
  section: Section | null;
  roles: ClassRole[];
  posts: Post[];
  popularThreshold: number;
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username || "");
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const [bundle, setBundle] = useState<ProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user || !username) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

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
            setBundle(null);
            setError("User not found");
            setLoading(false);
            return;
          }
        }
        setBundle({
          profile,
          college: catalog.colleges.find((c) => c.id === profile.college_id) || null,
          classRow: catalog.classes.find((c) => c.id === profile.class_id) || null,
          section: catalog.sections.find((s) => s.id === profile.section_id) || null,
          roles: catalog.roles.filter((r) => r.user_id === profile.id),
          posts: catalog.posts.filter((p) => p.author_id === profile.id),
          popularThreshold: catalog.popularThreshold,
        });
        setLoading(false);
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

        // Own profile fallback if username row missing/RLS race
        if (
          !profile &&
          user!.username &&
          user!.username.toLowerCase() === uname
        ) {
          profile = user!;
        }

        if (!profile) {
          if (!cancelled) {
            setBundle(null);
            setError("User not found");
            setLoading(false);
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
            setBundle(null);
            setError("User not found");
            setLoading(false);
          }
          return;
        }

        const [collegeRes, classRes, sectionRes, rolesRes, postsRes, settingsRes] =
          await Promise.all([
            p.college_id
              ? supabase.from("colleges").select("*").eq("id", p.college_id).maybeSingle()
              : Promise.resolve({ data: null }),
            p.class_id
              ? supabase.from("classes").select("*").eq("id", p.class_id).maybeSingle()
              : Promise.resolve({ data: null }),
            p.section_id
              ? supabase.from("sections").select("*").eq("id", p.section_id).maybeSingle()
              : Promise.resolve({ data: null }),
            supabase.from("class_roles").select("*").eq("user_id", p.id),
            supabase
              .from("posts")
              .select("*")
              .eq("author_id", p.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("app_settings")
              .select("value")
              .eq("key", "popular_like_threshold")
              .maybeSingle(),
          ]);

        if (cancelled) return;

        const thresholdRaw = (settingsRes as { data?: { value?: unknown } | null }).data
          ?.value;
        const popularThreshold =
          typeof thresholdRaw === "number"
            ? thresholdRaw
            : Number(thresholdRaw) || catalog.popularThreshold || 10;

        setBundle({
          profile: {
            ...p,
            socials: p.socials || {},
          },
          college: (collegeRes.data as College) || null,
          classRow: (classRes.data as ClassRow) || null,
          section: (sectionRes.data as Section) || null,
          roles: ((rolesRes.data as ClassRole[]) || []).filter(
            (r) => r.role === "cr" || r.role === "professor"
          ),
          posts: (postsRes.data as Post[]) || [],
          popularThreshold,
        });
      } catch (e) {
        if (!cancelled) {
          setBundle(null);
          setError(e instanceof Error ? e.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, user, username, demoMode, catalog]);

  const badges = useMemo(() => {
    if (!bundle) return [];
    return buildBadges({
      profile: bundle.profile,
      roles: bundle.roles,
      classes: bundle.classRow ? [bundle.classRow] : [],
      sections: bundle.section ? [bundle.section] : [],
      popularThreshold: bundle.popularThreshold,
    });
  }, [bundle]);

  if (!user) return null;

  if (loading) {
    return (
      <AppShell>
        <div className="card m-4 p-8 text-center text-[var(--muted)]">
          Loading profile…
        </div>
      </AppShell>
    );
  }

  if (!bundle?.profile) {
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

  const { profile, college, classRow, section, posts } = bundle;
  const isSelf = user.id === profile.id;

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
                <BadgeList badges={badges} />
              </div>
              <p className="text-[var(--muted)]">@{profile.username}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {college?.name || (isSelf ? "Finish onboarding to set college" : "—")}
                {classRow
                  ? ` · ${classSectionLabel(classRow, section || undefined)}`
                  : ""}
              </p>
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
                  <a href={profile.socials.instagram} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                )}
                {profile.socials?.linkedin && (
                  <a href={profile.socials.linkedin} target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                )}
                {profile.socials?.github && (
                  <a href={profile.socials.github} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                )}
                {profile.socials?.website && (
                  <a href={profile.socials.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {isSelf ? (
                  <>
                    <Link href="/profile/edit" className="btn btn-ghost inline-flex">
                      Edit profile
                    </Link>
                    <Link href="/messages" className="btn btn-ghost inline-flex">
                      Messages
                    </Link>
                  </>
                ) : (
                  <>
                    <SendFriendButton targetUserId={profile.id} />
                    <Link
                      href={`/messages/${profile.username}`}
                      className="btn btn-ghost inline-flex"
                    >
                      Message
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">
          Posts · {posts.length}
        </h2>
        <div className="space-y-4 pb-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} author={profile} />
          ))}
          {posts.length === 0 && (
            <div className="card p-6 text-center text-[var(--muted)]">No posts yet</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
