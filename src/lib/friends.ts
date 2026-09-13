import { createClient } from "@/lib/supabase/client";
import type { FriendRequest, Profile } from "@/lib/types";

export type FriendBundle = {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  friends: Profile[];
  requests: FriendRequest[];
};

export async function fetchFriendBundle(
  userId: string
): Promise<{ data: FriendBundle; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
  if (error) {
    return {
      data: { incoming: [], outgoing: [], friends: [], requests: [] },
      error: error.message,
    };
  }
  const requests = (data as FriendRequest[]) || [];
  const incoming = requests.filter(
    (r) => r.to_user_id === userId && r.status === "pending"
  );
  const outgoing = requests.filter(
    (r) => r.from_user_id === userId && r.status === "pending"
  );
  const friendIds = requests
    .filter((r) => r.status === "accepted")
    .map((r) =>
      r.from_user_id === userId ? r.to_user_id : r.from_user_id
    );

  let friends: Profile[] = [];
  if (friendIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", friendIds);
    friends = (profiles as Profile[]) || [];
  }

  return { data: { incoming, outgoing, friends, requests } };
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<{ error?: string }> {
  if (fromUserId === toUserId) return { error: "Cannot friend yourself" };
  const supabase = createClient();
  const { data: people, error: peopleErr } = await supabase
    .from("profiles")
    .select("id, college_id")
    .in("id", [fromUserId, toUserId]);
  if (peopleErr) return { error: peopleErr.message };
  const from = people?.find((p) => p.id === fromUserId);
  const to = people?.find((p) => p.id === toUserId);
  if (!from || !to) return { error: "User not found" };
  if (!from.college_id || from.college_id !== to.college_id) {
    return { error: "Friends must be in the same college" };
  }
  const { error } = await supabase.from("friend_requests").insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: "pending",
  });
  if (error) return { error: error.message };
  return {};
}

export async function respondFriendRequest(
  requestId: string,
  userId: string,
  accept: boolean
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: req, error: fetchErr } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };
  if (!req) return { error: "Request not found" };
  if (req.to_user_id !== userId) return { error: "Not your request" };
  if (req.status !== "pending") return { error: "Already handled" };

  const { error } = await supabase
    .from("friend_requests")
    .update({
      status: accept ? "accepted" : "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) return { error: error.message };

  if (accept) {
    const [a, b] =
      req.from_user_id < req.to_user_id
        ? [req.from_user_id, req.to_user_id]
        : [req.to_user_id, req.from_user_id];
    await supabase.from("conversations").upsert(
      { user_a_id: a, user_b_id: b },
      { onConflict: "user_a_id,user_b_id", ignoreDuplicates: true }
    );
  }
  return {};
}

export async function areFriends(a: string, b: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(from_user_id.eq.${a},to_user_id.eq.${b}),and(from_user_id.eq.${b},to_user_id.eq.${a})`
    )
    .maybeSingle();
  return Boolean(data);
}

export async function countPendingFriendRequests(
  userId: string
): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("friend_requests")
    .select("*", { count: "exact", head: true })
    .eq("to_user_id", userId)
    .eq("status", "pending");
  return count || 0;
}
