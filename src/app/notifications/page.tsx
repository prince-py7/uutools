"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState, LoadingInline } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth-context";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { enablePushNotifications, pushSupported } from "@/lib/push";
import type { AppNotification } from "@/lib/types";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function NotificationsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void listNotifications(user.id).then((res) => {
      if (cancelled) return;
      if (res.error) toast.error(res.error);
      setItems(res.items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  async function onOpen(n: AppNotification) {
    if (!user) return;
    if (!n.read_at) {
      await markNotificationRead(user.id, n.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
        )
      );
    }
  }

  async function onMarkAll() {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || now })));
    toast.success("All caught up");
  }

  async function onEnablePush() {
    if (!user) return;
    setPushBusy(true);
    const res = await enablePushNotifications(user.id);
    setPushBusy(false);
    if (res.ok) toast.success("Class alerts enabled on this device");
    else toast.error(res.error || "Could not enable alerts");
  }

  if (!ready || !user) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-6 md:px-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-[var(--muted)]">
              Class updates and campus alerts
            </p>
          </div>
          {unread > 0 ? (
            <button type="button" className="btn btn-ghost text-sm" onClick={() => void onMarkAll()}>
              Mark all read
            </button>
          ) : null}
        </div>

        {pushSupported() ? (
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Phone alerts</p>
              <p className="text-xs text-[var(--muted)]">
                Get class announcements even when the app is closed
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary shrink-0"
              disabled={pushBusy}
              onClick={() => void onEnablePush()}
            >
              {pushBusy ? "Enabling…" : "Enable"}
            </button>
          </div>
        ) : null}

        {loading ? (
          <LoadingInline label="Loading notifications…" />
        ) : items.length === 0 ? (
          <div className="card space-y-2 p-8 text-center">
            <Bell className="mx-auto text-[var(--muted)]" size={28} />
            <p className="font-medium">You are all caught up</p>
            <p className="text-sm text-[var(--muted)]">
              Class announcements from your CR or professors will show up here.
            </p>
            <Link href="/home" className="btn btn-ghost mt-2 inline-flex">
              Back to home
            </Link>
          </div>
        ) : (
          <ul className="card divide-y divide-[var(--line)] overflow-hidden">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#141414] ${
                    !n.read_at ? "bg-[#0f0f0f]" : ""
                  }`}
                  onClick={() => void onOpen(n)}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read_at ? "bg-transparent" : "bg-[var(--accent)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{n.title}</p>
                      <span className="shrink-0 text-[11px] text-[var(--muted)]">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--muted)] line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
