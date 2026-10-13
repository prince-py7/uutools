"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { ImagePlus, Mic, Send, Square, X } from "lucide-react";
import { Avatar } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoFileToDataUrl,
  demoGetOrCreateConversation,
  demoMarkConversationRead,
  demoSendMessage,
} from "@/lib/demo-store";
import {
  findProfileByUsername,
  getOrCreateConversation,
  listMessages,
  markConversationRead,
  sendMessage,
  subscribeConversationMessages,
} from "@/lib/messages";
import { uploadToSupabase } from "@/lib/supabase/upload";
import type { Message, Profile } from "@/lib/types";

export default function MessageThreadPage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const params = useParams<{ username: string | string[] }>();
  const username = Array.isArray(params.username)
    ? params.username[0]
    : params.username;

  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [livePeer, setLivePeer] = useState<Profile | null>(null);
  const [liveThread, setLiveThread] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const peer = demoMode ? demoPeer : livePeer;

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
    await markConversationRead(conv.conversation.id, user.id);
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
        if (res.conversation?.id) {
          demoMarkConversationRead(res.conversation.id, user.id);
        }
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

  // Live thread updates without full page refresh
  useEffect(() => {
    if (!user || demoMode || !convId) return;
    return subscribeConversationMessages(convId, () => {
      void (async () => {
        const msgs = await listMessages(convId);
        if (!msgs.error) setLiveThread(msgs.messages);
        await markConversationRead(convId, user.id);
      })();
    });
  }, [user, demoMode, convId]);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  async function uploadChatFile(
    file: File
  ): Promise<
    | { url: string; type: "image" | "audio" }
    | { error: string }
  > {
    if (!user) return { error: "Not signed in" };
    if (demoMode) {
      const res = await demoFileToDataUrl(file, "chat-media");
      if ("error" in res) return { error: res.error };
      if (res.mediaType !== "image" && res.mediaType !== "audio") {
        return { error: "Only images or voice notes are supported" };
      }
      return { url: res.url, type: res.mediaType };
    }
    const res = await uploadToSupabase(file, "chat-media", user.id);
    if ("error" in res) return { error: res.error };
    if (res.mediaType !== "image" && res.mediaType !== "audio") {
      return { error: "Only images or voice notes are supported" };
    }
    return { url: res.url, type: res.mediaType };
  }

  async function deliver(
    text: string,
    media?: { url: string; type: "image" | "audio" } | null
  ) {
    if (!convId || !user || sending) return;
    setSending(true);
    if (demoMode) {
      const res = demoSendMessage(convId, user.id, text, media);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        setBody("");
        setError("");
      }
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    const res = await sendMessage(convId, user.id, text, media);
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else if (res.message) {
      setBody("");
      setError("");
      setLiveThread((prev) => [...prev, res.message!]);
    }
    setSending(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    await deliver(body);
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    const uploaded = await uploadChatFile(file);
    if ("error" in uploaded) {
      toast.error(uploaded.error);
      return;
    }
    await deliver(body, { url: uploaded.url, type: uploaded.type });
  }

  async function toggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // Always use clean audio/webm (MediaRecorder often adds ;codecs=opus)
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        void (async () => {
          const uploaded = await uploadChatFile(file);
          if ("error" in uploaded) {
            toast.error(uploaded.error);
            return;
          }
          await deliver("", { url: uploaded.url, type: "audio" });
        })();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone permission is required for voice messages");
    }
  }

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-[var(--text)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--line)] px-3">
        <Link href="/messages" className="text-sm text-[var(--accent)]">
          Back
        </Link>
        {peer ? (
          <Link
            href={`/profile/${peer.username}`}
            className="flex min-w-0 items-center gap-2 font-semibold"
          >
            <Avatar name={peer.display_name} url={peer.avatar_url} size={32} />
            <span className="truncate">{peer.display_name}</span>
          </Link>
        ) : (
          <span className="text-[var(--muted)]">User not found</span>
        )}
        <button
          type="button"
          className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[#1a1a1a]"
          onClick={() => router.push("/messages")}
          aria-label="Close chat"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {error && !convId ? (
          <p className="text-sm text-[var(--danger)]">{error}</p>
        ) : null}
        {thread.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div
              key={m.id}
              className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                mine
                  ? "ml-auto bg-[var(--accent)] text-black"
                  : "bg-[#1a1a1a] text-[var(--text)]"
              }`}
            >
              {m.media_type === "image" && m.media_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.media_url}
                  alt="Shared"
                  className="mb-1 max-h-56 w-full rounded-xl object-cover"
                />
              ) : null}
              {m.media_type === "audio" && m.media_url ? (
                <audio
                  controls
                  src={m.media_url}
                  className="mb-1 w-full max-w-xs"
                />
              ) : null}
              {m.body ? (
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              ) : null}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {convId ? (
        <form
          onSubmit={(e) => void onSend(e)}
          className="flex shrink-0 items-end gap-2 border-t border-[var(--line)] bg-black px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              void onPickImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full bg-[#1a1a1a] text-[var(--muted)]"
            onClick={() => fileRef.current?.click()}
            disabled={sending || recording}
            aria-label="Send image"
          >
            <ImagePlus size={18} />
          </button>
          <button
            type="button"
            className={`grid h-11 w-11 place-items-center rounded-full ${
              recording
                ? "bg-[var(--danger)] text-white"
                : "bg-[#1a1a1a] text-[var(--muted)]"
            }`}
            onClick={() => void toggleRecord()}
            disabled={sending}
            aria-label={recording ? "Stop recording" : "Record voice"}
          >
            {recording ? <Square size={16} /> : <Mic size={18} />}
          </button>
          <input
            ref={inputRef}
            className="input min-h-11 flex-1"
            placeholder="Message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={sending || recording}
          />
          <button
            className="grid h-11 w-11 place-items-center rounded-full bg-[var(--accent)] text-black disabled:opacity-50"
            type="submit"
            disabled={sending || recording || !body.trim()}
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </form>
      ) : null}
    </div>
  );
}
