"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Badge";
import { LoadingInline } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { demoInboxPreview } from "@/lib/demo-store";
import { listInbox, previewText, subscribeInbox, type InboxItem } from "@/lib/messages";

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
    const refresh = () => {
      void listInbox(user.id).then((res) => {
        if (cancelled) return;
        if (res.error) toast.error(res.error);
        setLiveItems(res.items);
        setLoading(false);
      });
    };
    setLoading(true);
    refresh();
    const unsub = subscribeInbox(user.id, refresh);
    const onLocal = () => refresh();
    window.addEventListener("unitians:messages-changed", onLocal);
    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener("unitians:messages-changed", onLocal);
    };
  }, [user, demoMode, toast, catalog.messages, catalog.conversations]);

  // Recompute on every catalog/live change so demo previews stay fresh.
  const inbox: InboxItem[] = !user
    ? []
    : demoMode
      ? demoInboxPreview(user.id)
      : liveItems;

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-3 px-3 pt-3 md:px-4">
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="text-xs text-[var(--muted)]">
          Private chats with friends. Group chats are coming soon.
        </p>
        <div className="card divide-y divide-[var(--line)]">
          {loading ? (
            <LoadingInline label="Loading messages…" />
          ) : inbox.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted)]">
              No conversations yet. Accept a friend request, then tap Message on
              their profile.
            </p>
          ) : (
            inbox.map(({ conversation, peer, lastMessage, unreadCount }) => (
              <Link
                key={conversation.id}
                href={`/messages/${peer.username}`}
                className="flex items-center gap-3 p-4 hover:bg-[#1a1a1a]"
              >
                <Avatar name={peer.display_name} url={peer.avatar_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate font-semibold ${
                        unreadCount ? "text-white" : ""
                      }`}
                    >
                      {peer.display_name}
                    </p>
                    {unreadCount > 0 ? (
                      <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-black">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={`line-clamp-2 text-xs ${
                      unreadCount
                        ? "font-medium text-[var(--text)]"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {previewText(lastMessage)}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
