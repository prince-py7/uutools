"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Badge";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoGetOrCreateConversation,
  demoSendMessage,
} from "@/lib/demo-store";

export default function MessageThreadPage() {
  const { user, ready } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const username = params.username;
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [convId, setConvId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.onboarding_complete) router.replace("/onboarding");
  }, [ready, user, router]);

  const other = useMemo(
    () =>
      catalog.profiles.find(
        (p) =>
          p.username === username &&
          (!user?.college_id || p.college_id === user.college_id)
      ),
    [catalog.profiles, username, user?.college_id]
  );

  useEffect(() => {
    if (!user || !other) {
      setConvId(null);
      return;
    }
    const res = demoGetOrCreateConversation(user.id, other.id);
    if (res.error) {
      setError(res.error);
      setConvId(null);
    } else {
      setError("");
      setConvId(res.conversation?.id || null);
    }
  }, [user, other, catalog.friendRequests, catalog.conversations]);

  const thread = useMemo(() => {
    if (!convId) return [];
    return catalog.messages
      .filter((m) => m.conversation_id === convId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [catalog.messages, convId]);

  if (!user) return null;

  function send(e: FormEvent) {
    e.preventDefault();
    if (!convId || !user) return;
    const res = demoSendMessage(convId, user.id, body);
    if (res.error) setError(res.error);
    else {
      setBody("");
      setError("");
    }
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
                <Avatar name={other.display_name} url={other.avatar_url} size={28} />
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
              onSubmit={send}
              className="flex gap-2 border-t border-[var(--line)] p-3"
            >
              <input
                className="input"
                placeholder="Message…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
