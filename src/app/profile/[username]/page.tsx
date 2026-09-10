"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar, BadgeList } from "@/components/ui/Badge";
import { PostCard } from "@/components/feed/PostCard";
import { SendFriendButton } from "@/components/social/FriendRequests";
import { buildBadges, classSectionLabel } from "@/lib/badges";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user, ready } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  const profile = catalog.profiles.find((p) => {
    if (p.username !== params.username) return false;
    if (!user) return true;
    if (p.id === user.id) return true;
    if (user.is_admin) return true;
    return Boolean(user.college_id && p.college_id === user.college_id);
  });
  const cls = catalog.classes.find((c) => c.id === profile?.class_id);
  const sec = catalog.sections.find((s) => s.id === profile?.section_id);
  const college = catalog.colleges.find((c) => c.id === profile?.college_id);

  const badges = useMemo(() => {
    if (!profile) return [];
    return buildBadges({
      profile,
      roles: catalog.roles,
      classes: catalog.classes,
      sections: catalog.sections,
      popularThreshold: catalog.popularThreshold,
    });
  }, [profile, catalog]);

  const posts = catalog.posts.filter((p) => p.author_id === profile?.id);

  if (!profile) {
    return (
      <AppShell>
        <div className="card m-4 p-8 text-center">User not found</div>
      </AppShell>
    );
  }

  const isSelf = user?.id === profile.id;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-4 md:px-0">
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <Avatar name={profile.display_name} url={profile.avatar_url} size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">
                  {profile.display_name}
                </h1>
                <BadgeList badges={badges} />
              </div>
              <p className="text-[var(--muted)]">@{profile.username}</p>
              <p className="mt-2 text-sm">
                {college?.name}
                {cls ? ` · ${classSectionLabel(cls, sec)}` : ""}
              </p>
              {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--accent-2)]">
                {profile.socials.instagram && (
                  <a href={profile.socials.instagram} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                )}
                {profile.socials.linkedin && (
                  <a href={profile.socials.linkedin} target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                )}
                {profile.socials.github && (
                  <a href={profile.socials.github} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                )}
                {profile.socials.website && (
                  <a href={profile.socials.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {isSelf ? (
                  <Link href="/profile/edit" className="btn btn-ghost inline-flex">
                    Edit profile / Account
                  </Link>
                ) : (
                  <SendFriendButton targetUserId={profile.id} />
                )}
              </div>
            </div>
          </div>
        </div>

        <h2 className="px-1 font-semibold">Posts</h2>
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {posts.length === 0 && (
            <div className="card p-6 text-center text-[var(--muted)]">No posts yet</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
