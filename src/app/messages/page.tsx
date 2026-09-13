"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { listInbox, type InboxItem } from "@/lib/messages";

export default function MessagesInboxPage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const [liveItems, setLiveItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(!demoMode);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.onboarding_complete) router.replace("/onboarding");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user || demoMode) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listInbox(user.id).then((res) => {
      if (cancelled) return;
      if (res.error) toast.error(res.error);
      setLiveItems(res.items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, demoMode, toast]);

  const inbox = useMemo(() => {
    if (!user) return [] as InboxItem[];
    if (!demoMode) return liveItems;
    return catalog.conversations
      .filter((c) => c.user_a_id === user.id || c.user_b_id === user.id)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      .map((conversation) => {
        const peerId =
          conversation.user_a_id === user.id
            ? conversation.user_b_id
            : conversation.user_a_id;
        const peer = catalog.profiles.find((p) => p.id === peerId);
        return peer ? { conversation, peer } : null;
      })
      .filter(Boolean) as InboxItem[];
  }, [user, demoMode, liveItems, catalog.conversations, catalog.profiles]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-3 px-3 pt-3 md:px-4">
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="text-xs text-[var(--muted)]">
          Private 1:1 DMs with friends in your college. Group chats are out of
          scope.
        </p>
        <div className="card divide-y divide-[var(--line)]">
          {loading ? (
            <p className="p-5 text-sm text-[var(--muted)]">Loading…</p>
          ) : inbox.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted)]">
              No conversations yet. Accept a friend request, then tap Message.
            </p>
          ) : (
            inbox.map(({ conversation, peer }) => (
              <Link
                key={conversation.id}
                href={`/messages/${peer.username}`}
                className="flex items-center gap-3 p-4 hover:bg-[#1a1a1a]"
              >
                <Avatar name={peer.display_name} url={peer.avatar_url} />
                <div>
                  <p className="font-semibold">{peer.display_name}</p>
                  <p className="text-xs text-[var(--muted)]">@{peer.username}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
