"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Check, X } from "lucide-react";
import { Avatar } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoRespondFriendRequest,
  demoSendFriendRequest,
} from "@/lib/demo-store";
import {
  fetchFriendBundle,
  respondFriendRequest,
  sendFriendRequest,
  type FriendBundle,
} from "@/lib/friends";
import type { FriendRequest, Profile } from "@/lib/types";

function emptyBundle(): FriendBundle {
  return { incoming: [], outgoing: [], friends: [], requests: [] };
}

export function FriendRequestsPanel({ onClose }: { onClose?: () => void }) {
  const { user, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();
  const [tab, setTab] = useState<"incoming" | "outgoing" | "friends">(
    "incoming"
  );
  const [msg, setMsg] = useState("");
  const [live, setLive] = useState<FriendBundle>(emptyBundle());
  const [extraProfiles, setExtraProfiles] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!user || demoMode) return;
    const res = await fetchFriendBundle(user.id);
    if (res.error) toast.error(res.error);
    setLive(res.data);
  }, [user, demoMode, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const incoming = useMemo(() => {
    if (demoMode) {
      return catalog.friendRequests.filter(
        (r) => r.to_user_id === user?.id && r.status === "pending"
      );
    }
    return live.incoming;
  }, [demoMode, catalog.friendRequests, user?.id, live.incoming]);

  const outgoing = useMemo(() => {
    if (demoMode) {
      return catalog.friendRequests.filter(
        (r) => r.from_user_id === user?.id && r.status === "pending"
      );
    }
    return live.outgoing;
  }, [demoMode, catalog.friendRequests, user?.id, live.outgoing]);

  const friendIds = useMemo(() => {
    if (!user) return [] as string[];
    if (demoMode) {
      const ids: string[] = [];
      for (const r of catalog.friendRequests) {
        if (r.status !== "accepted") continue;
        if (r.from_user_id === user.id) ids.push(r.to_user_id);
        else if (r.to_user_id === user.id) ids.push(r.from_user_id);
      }
      return ids;
    }
    return live.friends.map((p) => p.id);
  }, [demoMode, catalog.friendRequests, user, live.friends]);

  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of catalog.profiles) map.set(p.id, p);
    for (const p of live.friends) map.set(p.id, p);
    for (const p of extraProfiles) map.set(p.id, p);
    return map;
  }, [catalog.profiles, live.friends, extraProfiles]);

  useEffect(() => {
    if (!user || demoMode) return;
    const needed = new Set<string>();
    for (const r of [...incoming, ...outgoing]) {
      needed.add(r.from_user_id);
      needed.add(r.to_user_id);
    }
    const missing = [...needed].filter((id) => !profileMap.has(id));
    if (!missing.length) return;
    let cancelled = false;
    void (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("*").in("id", missing);
      if (!cancelled && data?.length) {
        setExtraProfiles((prev) => [...prev, ...(data as Profile[])]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incoming, outgoing, demoMode, user, profileMap]);

  if (!user) return null;
  const userId = user.id;

  async function onRespond(requestId: string, accept: boolean) {
    if (busy) return;
    setBusy(true);
    if (demoMode) {
      demoRespondFriendRequest(requestId, userId, accept);
      setMsg(accept ? "Accepted" : "Rejected");
      setBusy(false);
      return;
    }
    const res = await respondFriendRequest(requestId, userId, accept);
    if (res.error) toast.error(res.error);
    else {
      setMsg(accept ? "Accepted" : "Rejected");
      await reload();
    }
    setBusy(false);
  }

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex gap-1 border-b border-[var(--line)] px-2 pt-2">
        {(
          [
            ["incoming", `Incoming (${incoming.length})`],
            ["outgoing", `Outgoing (${outgoing.length})`],
            ["friends", `Friends (${friendIds.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`flex-1 rounded-t-md px-2 py-2 text-xs font-medium ${
              tab === key
                ? "bg-[#1a1a1a] text-white"
                : "text-[var(--muted)] hover:text-white"
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {tab === "incoming" &&
          (incoming.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No incoming requests.</p>
          ) : (
            incoming.map((r) => {
              const p = profileMap.get(r.from_user_id);
              if (!p) return null;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-3"
                >
                  <Avatar name={p.display_name} url={p.avatar_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.display_name}</p>
                    <p className="text-xs text-[var(--muted)]">@{p.username}</p>
                  </div>
                  <button
                    type="button"
                    className="icon-btn text-[var(--popular)]"
                    aria-label="Accept"
                    disabled={busy}
                    onClick={() => void onRespond(r.id, true)}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn text-[var(--danger)]"
                    aria-label="Reject"
                    disabled={busy}
                    onClick={() => void onRespond(r.id, false)}
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })
          ))}

        {tab === "outgoing" &&
          (outgoing.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No outgoing requests.</p>
          ) : (
            outgoing.map((r) => {
              const p = profileMap.get(r.to_user_id);
              if (!p) return null;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-3"
                >
                  <Avatar name={p.display_name} url={p.avatar_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.display_name}</p>
                    <p className="text-xs text-[var(--muted)]">Pending</p>
                  </div>
                </div>
              );
            })
          ))}

        {tab === "friends" &&
          (friendIds.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No friends yet. Accept requests or send one from a profile.
            </p>
          ) : (
            friendIds.map((fid) => {
              const p = profileMap.get(fid);
              if (!p) return null;
              return (
                <div
                  key={fid}
                  className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-3"
                >
                  <Avatar name={p.display_name} url={p.avatar_url} size={36} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${p.username}`}
                      className="truncate text-sm font-semibold hover:underline"
                      onClick={onClose}
                    >
                      {p.display_name}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">@{p.username}</p>
                  </div>
                  <Link
                    href={`/messages/${p.username}`}
                    className="icon-btn"
                    title="Message"
                    onClick={onClose}
                  >
                    <MessageCircle size={18} />
                  </Link>
                </div>
              );
            })
          ))}
      </div>
      {msg && (
        <p className="border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--popular)]">
          {msg}
        </p>
      )}
      <p className="border-t border-[var(--line)] px-4 py-2 text-[11px] text-[var(--muted)]">
        1:1 DMs only. Group chats are out of scope.
      </p>
    </div>
  );
}

export function SendFriendButton({ targetUserId }: { targetUserId: string }) {
  const { user, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<
    "none" | "pending_out" | "pending_in" | "friends" | "loading"
  >("loading");
  const [peerUsername, setPeerUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.id === targetUserId) return;
    let cancelled = false;

    async function load() {
      if (demoMode) {
        const existing = catalog.friendRequests.find(
          (r) =>
            (r.from_user_id === user!.id && r.to_user_id === targetUserId) ||
            (r.from_user_id === targetUserId && r.to_user_id === user!.id)
        );
        const other = catalog.profiles.find((p) => p.id === targetUserId);
        if (!cancelled) {
          setPeerUsername(other?.username || null);
          if (!existing) setStatus("none");
          else if (existing.status === "accepted") setStatus("friends");
          else if (existing.from_user_id === user!.id) setStatus("pending_out");
          else setStatus("pending_in");
        }
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const [{ data: peer }, { data: reqs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("username")
          .eq("id", targetUserId)
          .maybeSingle(),
        supabase
          .from("friend_requests")
          .select("*")
          .or(
            `and(from_user_id.eq.${user!.id},to_user_id.eq.${targetUserId}),and(from_user_id.eq.${targetUserId},to_user_id.eq.${user!.id})`
          ),
      ]);
      if (cancelled) return;
      setPeerUsername((peer as { username?: string } | null)?.username || null);
      const existing = ((reqs as FriendRequest[]) || [])[0];
      if (!existing) setStatus("none");
      else if (existing.status === "accepted") setStatus("friends");
      else if (existing.from_user_id === user!.id) setStatus("pending_out");
      else setStatus("pending_in");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, targetUserId, demoMode, catalog.friendRequests, catalog.profiles]);

  if (!user || user.id === targetUserId) return null;

  if (status === "loading") {
    return (
      <button type="button" className="btn btn-ghost" disabled>
        …
      </button>
    );
  }

  if (status === "friends") {
    return (
      <Link href={`/messages/${peerUsername || ""}`} className="btn btn-primary">
        Message
      </Link>
    );
  }
  if (status === "pending_out" || status === "pending_in") {
    return (
      <button type="button" className="btn btn-ghost" disabled>
        {status === "pending_out" ? "Request sent" : "Respond in Requests"}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          void (async () => {
            if (demoMode) {
              const res = demoSendFriendRequest(user.id, targetUserId);
              if (res.error) setError(res.error);
              else {
                setError("");
                setStatus("pending_out");
              }
              return;
            }
            const res = await sendFriendRequest(user.id, targetUserId);
            if (res.error) {
              setError(res.error);
              toast.error(res.error);
            } else {
              setError("");
              setStatus("pending_out");
              toast.success("Friend request sent");
            }
          })();
        }}
      >
        Add friend
      </button>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
