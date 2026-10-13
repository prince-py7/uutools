"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Check, X, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoCancelFriendRequest,
  demoFriendshipStatus,
  demoRespondFriendRequest,
  demoRemoveFriend,
  demoSendFriendRequest,
} from "@/lib/demo-store";
import {
  cancelFriendRequest,
  fetchFriendBundle,
  getFriendshipStatus,
  notifyFriendsUpdated,
  respondFriendRequest,
  removeFriend,
  sendFriendRequest,
  type FriendBundle,
} from "@/lib/friends";
import type { Profile } from "@/lib/types";

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
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user || demoMode) return;
    const res = await fetchFriendBundle(user.id);
    if (res.error) toast.error(res.error);
    setLive(res.data);
  }, [user, demoMode, toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    function onFriends() {
      void reload();
    }
    window.addEventListener("uu-friends-updated", onFriends);
    return () => window.removeEventListener("uu-friends-updated", onFriends);
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
    for (const fid of friendIds) needed.add(fid);
    const missing = [...needed].filter((id) => !profileMap.has(id));
    if (!missing.length) return;
    let cancelled = false;
    void (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("id", missing);
      if (!cancelled && data?.length) {
        setExtraProfiles((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const next = [...prev];
          for (const p of data as Profile[]) {
            if (!seen.has(p.id)) next.push(p);
          }
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incoming, outgoing, friendIds, demoMode, user, profileMap]);

  if (!user) return null;
  const userId = user.id;

  async function onRespond(requestId: string, accept: boolean) {
    if (busyId) return;
    setBusyId(requestId);
    if (demoMode) {
      const res = demoRespondFriendRequest(requestId, userId, accept);
      if ("error" in res && res.error) toast.error(res.error);
      else setMsg(accept ? "Accepted" : "Rejected");
      setBusyId(null);
      return;
    }
    const res = await respondFriendRequest(requestId, userId, accept);
    if (res.error) toast.error(res.error);
    else {
      setMsg(accept ? "Accepted" : "Rejected");
      await reload();
    }
    setBusyId(null);
  }

  async function onCancel(requestId: string) {
    if (busyId) return;
    setBusyId(requestId);
    if (demoMode) {
      const res = demoCancelFriendRequest(requestId, userId);
      if (res.error) toast.error(res.error);
      else setMsg("Request cancelled");
      setBusyId(null);
      return;
    }
    const res = await cancelFriendRequest(requestId, userId);
    if (res.error) toast.error(res.error);
    else {
      setMsg("Request cancelled");
      await reload();
    }
    setBusyId(null);
  }

  async function onRemoveFriend(friendId: string) {
    if (busyId) return;
    if (!window.confirm("Remove this friend?")) return;
    setBusyId(friendId);
    if (demoMode) {
      const res = demoRemoveFriend(userId, friendId);
      if (res.error) toast.error(res.error);
      else setMsg("Friend removed");
      setBusyId(null);
      return;
    }
    const res = await removeFriend(userId, friendId);
    if (res.error) toast.error(res.error);
    else {
      setMsg("Friend removed");
      await reload();
    }
    setBusyId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-3"
                >
                  <Avatar
                    name={p?.display_name || "?"}
                    url={p?.avatar_url}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    {p ? (
                      <>
                        <Link
                          href={`/profile/${p.username}`}
                          className="truncate text-sm font-semibold hover:underline"
                          onClick={onClose}
                        >
                          {p.display_name}
                        </Link>
                        <p className="text-xs text-[var(--muted)]">
                          @{p.username}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">Loading…</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-btn text-[var(--popular)]"
                    aria-label="Accept"
                    disabled={busyId === r.id}
                    onClick={() => void onRespond(r.id, true)}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn text-[var(--danger)]"
                    aria-label="Reject"
                    disabled={busyId === r.id}
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
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--line)] p-3"
                >
                  <Avatar
                    name={p?.display_name || "?"}
                    url={p?.avatar_url}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    {p ? (
                      <>
                        <p className="truncate text-sm font-semibold">
                          {p.display_name}
                        </p>
                        <p className="text-xs text-[var(--muted)]">Pending</p>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">Pending…</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost h-8 border-0 px-2 text-xs text-[var(--danger)]"
                    disabled={busyId === r.id}
                    onClick={() => void onCancel(r.id)}
                  >
                    Cancel
                  </button>
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
              if (!p) {
                return (
                  <div
                    key={fid}
                    className="rounded-lg border border-[var(--line)] p-3 text-sm text-[var(--muted)]"
                  >
                    Loading friend…
                  </div>
                );
              }
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
                  <button
                    type="button"
                    className="btn btn-ghost h-8 border-0 px-2 text-xs text-[var(--danger)]"
                    disabled={busyId === fid}
                    onClick={() => void onRemoveFriend(fid)}
                  >
                    Remove
                  </button>
                </div>
              );
            })
          ))}
      </div>
      {msg ? (
        <p className="border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--popular)]">
          {msg}
        </p>
      ) : null}
      <p className="border-t border-[var(--line)] px-4 py-2 text-[11px] text-[var(--muted)]">
        1:1 DMs only. Group chats are out of scope.
      </p>
    </div>
  );
}

export function SendFriendButton({
  targetUserId,
  compact = false,
}: {
  targetUserId: string;
  compact?: boolean;
}) {
  const { user, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<
    "none" | "pending_out" | "pending_in" | "friends" | "loading"
  >("loading");
  const [incomingId, setIncomingId] = useState<string | null>(null);
  const [peerUsername, setPeerUsername] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.id === targetUserId) return;

    if (demoMode) {
      const existing = catalog.friendRequests.find(
        (r) =>
          (r.from_user_id === user.id && r.to_user_id === targetUserId) ||
          (r.from_user_id === targetUserId && r.to_user_id === user.id)
      );
      const other = catalog.profiles.find((p) => p.id === targetUserId);
      setPeerUsername(other?.username || null);
      const st = demoFriendshipStatus(user.id, targetUserId);
      setStatus(st);
      setIncomingId(
        existing &&
          existing.status === "pending" &&
          existing.to_user_id === user.id
          ? existing.id
          : null
      );
      return;
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const [{ data: peer }, st] = await Promise.all([
      supabase
        .from("profiles")
        .select("username")
        .eq("id", targetUserId)
        .maybeSingle(),
      getFriendshipStatus(user.id, targetUserId),
    ]);
    setPeerUsername((peer as { username?: string } | null)?.username || null);
    setStatus(st);

    if (st === "pending_in") {
      const { data: reqs } = await supabase
        .from("friend_requests")
        .select("id")
        .eq("from_user_id", targetUserId)
        .eq("to_user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      setIncomingId((reqs as { id?: string } | null)?.id || null);
    } else {
      setIncomingId(null);
    }
  }, [user, targetUserId, demoMode, catalog.friendRequests, catalog.profiles]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onFriends() {
      void refresh();
    }
    window.addEventListener("uu-friends-updated", onFriends);
    return () => window.removeEventListener("uu-friends-updated", onFriends);
  }, [refresh]);

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
      <Link
        href={`/messages/${peerUsername || ""}`}
        className={compact ? "btn btn-ghost h-8 text-xs" : "btn btn-primary"}
      >
        Message
      </Link>
    );
  }

  if (status === "pending_in") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={compact ? "btn btn-primary h-8 text-xs" : "btn btn-primary"}
          disabled={busy || !incomingId}
          onClick={() => {
            if (!incomingId) return;
            void (async () => {
              setBusy(true);
              if (demoMode) {
                const res = demoRespondFriendRequest(incomingId, user.id, true);
                if ("error" in res && res.error) toast.error(res.error);
                else {
                  setStatus("friends");
                  toast.success("Friend request accepted");
                }
              } else {
                const res = await respondFriendRequest(
                  incomingId,
                  user.id,
                  true
                );
                if (res.error) toast.error(res.error);
                else {
                  setStatus("friends");
                  toast.success("Friend request accepted");
                }
              }
              setBusy(false);
            })();
          }}
        >
          Accept
        </button>
        <button
          type="button"
          className={compact ? "btn btn-ghost h-8 text-xs" : "btn btn-ghost"}
          disabled={busy || !incomingId}
          onClick={() => {
            if (!incomingId) return;
            void (async () => {
              setBusy(true);
              if (demoMode) {
                demoRespondFriendRequest(incomingId, user.id, false);
                setStatus("none");
              } else {
                const res = await respondFriendRequest(
                  incomingId,
                  user.id,
                  false
                );
                if (res.error) toast.error(res.error);
                else setStatus("none");
              }
              setBusy(false);
            })();
          }}
        >
          Reject
        </button>
      </div>
    );
  }

  if (status === "pending_out") {
    return (
      <button type="button" className="btn btn-ghost" disabled>
        Request sent
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-white/25 disabled:opacity-50"
            : "btn btn-primary"
        }
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setError("");
            if (demoMode) {
              const res = demoSendFriendRequest(user.id, targetUserId);
              if (res.error) {
                setError(res.error);
                toast.error(res.error);
                if (res.alreadyIncoming) await refresh();
              } else {
                setStatus("pending_out");
                toast.success("Friend request sent");
                notifyFriendsUpdated();
              }
            } else {
              const res = await sendFriendRequest(user.id, targetUserId);
              if (res.error) {
                setError(res.error);
                toast.error(res.error);
                if (res.alreadyIncoming) await refresh();
              } else {
                setStatus("pending_out");
                toast.success("Friend request sent");
              }
            }
            setBusy(false);
          })();
        }}
      >
        {compact ? (
          <>
            <UserPlus size={14} />
            Add friend
          </>
        ) : (
          "Add friend"
        )}
      </button>
      {error && !compact ? (
        <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}
