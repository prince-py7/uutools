"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Badge";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";

export default function MessagesInboxPage() {
  const { user, ready } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.onboarding_complete) router.replace("/onboarding");
  }, [ready, user, router]);

  const inbox = useMemo(() => {
    if (!user) return [];
    return catalog.conversations
      .filter((c) => c.user_a_id === user.id || c.user_b_id === user.id)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [catalog.conversations, user]);

  if (!user) return null;

  function peerOf(conv: { user_a_id: string; user_b_id: string }) {
    const pid = conv.user_a_id === user!.id ? conv.user_b_id : conv.user_a_id;
    return catalog.profiles.find((p) => p.id === pid);
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-3 px-3 pt-3 md:px-4">
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="text-xs text-[var(--muted)]">
          Private 1:1 DMs with friends in your college. Group chats are out of scope.
        </p>
        <div className="card divide-y divide-[var(--line)]">
          {inbox.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted)]">
              No conversations yet. Accept a friend request, then tap Message.
            </p>
          ) : (
            inbox.map((c) => {
              const peer = peerOf(c);
              if (!peer) return null;
              return (
                <Link
                  key={c.id}
                  href={`/messages/${peer.username}`}
                  className="flex items-center gap-3 p-4 hover:bg-[#1a1a1a]"
                >
                  <Avatar name={peer.display_name} url={peer.avatar_url} />
                  <div>
                    <p className="font-semibold">{peer.display_name}</p>
                    <p className="text-xs text-[var(--muted)]">@{peer.username}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
