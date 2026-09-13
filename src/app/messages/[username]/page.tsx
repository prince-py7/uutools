"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoGetOrCreateConversation,
  demoSendMessage,
} from "@/lib/demo-store";
import {
  findProfileByUsername,
  getOrCreateConversation,
  listMessages,
  sendMessage,
} from "@/lib/messages";
import type { Message, Profile } from "@/lib/types";

export default function MessageThreadPage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ username: string }>();
  const username = params.username;
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [livePeer, setLivePeer] = useState<Profile | null>(null);
  const [liveThread, setLiveThread] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.onboarding_complete) router.replace("/onboarding");
  }, [ready, user, router]);

  const demoPeer = useMemo(
    () =>
      catalog.profiles.find(
        (p) =>
          p.username === username &&
          (!user?.college_id || p.college_id === user.college_id)
      ) || null,
    [catalog.profiles, username, user?.college_id]
  );

  const other = demoMode ? demoPeer : livePeer;

  const reloadLive = useCallback(async () => {
    if (!user || demoMode) return;
    const found = await findProfileByUsername(username, user.college_id);
    if (found.error || !found.profile) {
      setLivePeer(null);
      setConvId(null);
      setError(found.error || "User not found");
      return;
    }
    setLivePeer(found.profile);
    const conv = await getOrCreateConversation(user.id, found.profile.id);
    if (conv.error || !conv.conversation) {
      setError(conv.error || "Could not open chat");
      setConvId(null);
      return;
    }
    setError("");
    setConvId(conv.conversation.id);
    const msgs = await listMessages(conv.conversation.id);
    if (msgs.error) toast.error(msgs.error);
    setLiveThread(msgs.messages);
  }, [user, demoMode, username, toast]);

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      if (!demoPeer) {
        setConvId(null);
        return;
      }
      const res = demoGetOrCreateConversation(user.id, demoPeer.id);
      if (res.error) {
        setError(res.error);
        setConvId(null);
      } else {
        setError("");
        setConvId(res.conversation?.id || null);
      }
      return;
    }
    void reloadLive();
  }, [
    user,
    demoMode,
    demoPeer,
    catalog.friendRequests,
    catalog.conversations,
    reloadLive,
  ]);

  const thread = useMemo(() => {
    if (!convId) return [] as Message[];
    if (!demoMode) return liveThread;
    return catalog.messages
      .filter((m) => m.conversation_id === convId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [convId, demoMode, liveThread, catalog.messages]);

  if (!user) return null;

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!convId || !user || sending) return;
    setSending(true);
    if (demoMode) {
      const res = demoSendMessage(convId, user.id, body);
      if (res.error) setError(res.error);
      else {
        setBody("");
        setError("");
      }
      setSending(false);
      return;
    }
    const res = await sendMessage(convId, user.id, body);
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else if (res.message) {
      setBody("");
      setError("");
      setLiveThread((prev) => [...prev, res.message!]);
    }
    setSending(false);
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-3 px-3 pt-3 md:px-4">
        <div className="card flex min-h-[70vh] flex-col">
          <div className="flex items-center gap-3 border-b border-[var(--line)] p-3">
            <Link href="/messages" className="text-sm text-[var(--accent)]">
              Inbox
            </Link>
            {other ? (
              <Link
                href={`/profile/${other.username}`}
                className="flex items-center gap-2 font-semibold"
              >
                <Avatar
                  name={other.display_name}
                  url={other.avatar_url}
                  size={28}
                />
                {other.display_name}
              </Link>
            ) : (
              <span className="text-[var(--muted)]">User not found</span>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {error && !convId && (
              <p className="text-sm text-[var(--danger)]">{error}</p>
            )}
            {thread.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.sender_id === user.id
                    ? "ml-auto bg-[var(--accent)] text-white"
                    : "bg-[#1a1a1a] text-[var(--text)]"
                }`}
              >
                {m.body}
              </div>
            ))}
          </div>
          {convId && (
            <form
              onSubmit={(e) => void send(e)}
              className="flex gap-2 border-t border-[var(--line)] p-3"
            >
              <input
                className="input"
                placeholder="Message…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <button
                className="btn btn-primary"
                type="submit"
                disabled={sending}
              >
                {sending ? "…" : "Send"}
              </button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
