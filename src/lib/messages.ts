import { createClient } from "@/lib/supabase/client";
import { areFriends } from "@/lib/friends";
import type { Conversation, Message, Profile } from "@/lib/types";

export type InboxItem = {
  conversation: Conversation;
  peer: Profile;
  lastMessage: Message | null;
  unreadCount: number;
};

function peerId(c: Conversation, userId: string) {
  return c.user_a_id === userId ? c.user_b_id : c.user_a_id;
}

export function previewText(m: Message | null): string {
  if (!m) return "Say hello";
  if (m.media_type === "image") return m.body?.trim() ? m.body : "Photo";
  if (m.media_type === "audio") return m.body?.trim() ? m.body : "Voice message";
  return m.body?.trim() || "Message";
}

export async function listInbox(
  userId: string
): Promise<{ items: InboxItem[]; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) return { items: [], error: error.message };
  const conversations = (data as Conversation[]) || [];
  if (!conversations.length) return { items: [] };

  const peerIds = conversations.map((c) => peerId(c, userId));
  const convIds = conversations.map((c) => c.id);

  const [{ data: profiles }, { data: messages }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", peerIds),
    supabase
      .from("messages")
      .select("*")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false }),
  ]);

  const byId = new Map(((profiles as Profile[]) || []).map((p) => [p.id, p]));
  const latestByConv = new Map<string, Message>();
  const unreadByConv = new Map<string, number>();
  for (const raw of (messages as Message[]) || []) {
    if (!latestByConv.has(raw.conversation_id)) {
      latestByConv.set(raw.conversation_id, {
        ...raw,
        media_url: raw.media_url ?? null,
        media_type: raw.media_type ?? null,
        read_at: raw.read_at ?? null,
      });
    }
    if (raw.sender_id !== userId && !raw.read_at) {
      unreadByConv.set(
        raw.conversation_id,
        (unreadByConv.get(raw.conversation_id) || 0) + 1
      );
    }
  }

  const items: InboxItem[] = [];
  for (const conversation of conversations) {
    const peer = byId.get(peerId(conversation, userId));
    if (!peer) continue;
    items.push({
      conversation,
      peer,
      lastMessage: latestByConv.get(conversation.id) || null,
      unreadCount: unreadByConv.get(conversation.id) || 0,
    });
  }
  return { items };
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const { items, error } = await listInbox(userId);
  if (error) return 0;
  return items.reduce((n, i) => n + i.unreadCount, 0);
}

export async function getOrCreateConversation(
  userId: string,
  otherId: string
): Promise<{ conversation?: Conversation; error?: string }> {
  if (!(await areFriends(userId, otherId))) {
    return { error: "You can only message friends" };
  }
  const supabase = createClient();
  const [a, b] = userId < otherId ? [userId, otherId] : [otherId, userId];
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_a_id", a)
    .eq("user_b_id", b)
    .maybeSingle();
  if (existing) return { conversation: existing as Conversation };

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_a_id: a, user_b_id: b })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { conversation: data as Conversation };
}

export async function listMessages(
  conversationId: string
): Promise<{ messages: Message[]; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return { messages: [], error: error.message };
  return {
    messages: ((data as Message[]) || []).map((m) => ({
      ...m,
      media_url: m.media_url ?? null,
      media_type: m.media_type ?? null,
      read_at: m.read_at ?? null,
    })),
  };
}

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
  if (error) return { error: error.message };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("unitians:messages-changed"));
  }
  return {};
}

/** Live updates for a thread (INSERT/UPDATE). */
export function subscribeConversationMessages(
  conversationId: string,
  onChange: () => void
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => onChange()
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Inbox / badge refresh when any message changes for this user. */
export function subscribeInbox(
  userId: string,
  onChange: () => void
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`inbox:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => onChange()
    )
    .subscribe();
  const poll = window.setInterval(onChange, 12000);
  return () => {
    window.clearInterval(poll);
    void supabase.removeChannel(channel);
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  media?: { url: string; type: "image" | "audio" } | null
): Promise<{ message?: Message; error?: string }> {
  const text = body.trim();
  if (!text && !media?.url) return { error: "Empty message" };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: text,
      media_url: media?.url || null,
      media_type: media?.type || null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return {
    message: {
      ...(data as Message),
      media_url: (data as Message).media_url ?? null,
      media_type: (data as Message).media_type ?? null,
      read_at: (data as Message).read_at ?? null,
    },
  };
}

export async function findProfileByUsername(
  username: string,
  collegeId?: string | null
): Promise<{ profile?: Profile; error?: string }> {
  const supabase = createClient();
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_disabled", false)
    .limit(1);
  if (collegeId) query = query.eq("college_id", collegeId);
  const { data, error } = await query.maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "User not found" };
  return { profile: data as Profile };
}
