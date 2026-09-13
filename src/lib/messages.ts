import { createClient } from "@/lib/supabase/client";
import { areFriends } from "@/lib/friends";
import type { Conversation, Message, Profile } from "@/lib/types";

export type InboxItem = {
  conversation: Conversation;
  peer: Profile;
};

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

  const peerIds = conversations.map((c) =>
    c.user_a_id === userId ? c.user_b_id : c.user_a_id
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", peerIds);
  const byId = new Map(
    ((profiles as Profile[]) || []).map((p) => [p.id, p])
  );

  const items: InboxItem[] = [];
  for (const conversation of conversations) {
    const peerId =
      conversation.user_a_id === userId
        ? conversation.user_b_id
        : conversation.user_a_id;
    const peer = byId.get(peerId);
    if (peer) items.push({ conversation, peer });
  }
  return { items };
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
  return { messages: (data as Message[]) || [] };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<{ message?: Message; error?: string }> {
  const text = body.trim();
  if (!text) return { error: "Empty message" };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: text,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { message: data as Message };
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
