"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle, Check, X } from "lucide-react";
import { Avatar } from "@/components/ui/Badge";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoRespondFriendRequest,
  demoSendFriendRequest,
} from "@/lib/demo-store";

export function FriendRequestsPanel({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const catalog = useDemoCatalog();
  const [tab, setTab] = useState<"incoming" | "outgoing" | "friends">("incoming");
  const [msg, setMsg] = useState("");

  const incoming = useMemo(
    () =>
      catalog.friendRequests.filter(
        (r) => r.to_user_id === user?.id && r.status === "pending"
      ),
    [catalog.friendRequests, user?.id]
  );
  const outgoing = useMemo(
    () =>
      catalog.friendRequests.filter(
        (r) => r.from_user_id === user?.id && r.status === "pending"
      ),
    [catalog.friendRequests, user?.id]
  );
  const friends = useMemo(() => {
    if (!user) return [];
    const ids: string[] = [];
    for (const r of catalog.friendRequests) {
      if (r.status !== "accepted") continue;
      if (r.from_user_id === user.id) ids.push(r.to_user_id);
      else if (r.to_user_id === user.id) ids.push(r.from_user_id);
    }
    return ids;
  }, [catalog.friendRequests, user]);

  if (!user) return null;

  function profile(id: string) {
    return catalog.profiles.find((p) => p.id === id);
  }

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex gap-1 border-b border-[var(--line)] px-2 pt-2">
        {(
          [
            ["incoming", `Incoming (${incoming.length})`],
            ["outgoing", `Outgoing (${outgoing.length})`],
            ["friends", `Friends (${friends.length})`],
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
              const p = profile(r.from_user_id);
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
                    onClick={() => {
                      demoRespondFriendRequest(r.id, user.id, true);
                      setMsg("Accepted");
                    }}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn text-[var(--danger)]"
                    aria-label="Reject"
                    onClick={() => {
                      demoRespondFriendRequest(r.id, user.id, false);
                      setMsg("Rejected");
                    }}
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
              const p = profile(r.to_user_id);
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
          (friends.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No friends yet. Accept requests or send one from a profile.
            </p>
          ) : (
            friends.map((fid) => {
              const p = profile(fid);
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
  const { user } = useAuth();
  const catalog = useDemoCatalog();
  const [error, setError] = useState("");

  if (!user || user.id === targetUserId) return null;

  const existing = catalog.friendRequests.find(
    (r) =>
      (r.from_user_id === user.id && r.to_user_id === targetUserId) ||
      (r.from_user_id === targetUserId && r.to_user_id === user.id)
  );

  if (existing?.status === "accepted") {
    const other = catalog.profiles.find((p) => p.id === targetUserId);
    return (
      <Link href={`/messages/${other?.username}`} className="btn btn-primary">
        Message
      </Link>
    );
  }
  if (existing?.status === "pending") {
    return (
      <button type="button" className="btn btn-ghost" disabled>
        {existing.from_user_id === user.id ? "Request sent" : "Respond in Requests"}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          const res = demoSendFriendRequest(user.id, targetUserId);
          if (res.error) setError(res.error);
          else setError("");
        }}
      >
        Add friend
      </button>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
