import { createClient } from "@/lib/supabase/client";
import type { FriendRequest, Profile } from "@/lib/types";

export type FriendBundle = {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  friends: Profile[];
  requests: FriendRequest[];
};

export function notifyFriendsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("uu-friends-updated"));
}

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

async function findRelation(
  a: string,
  b: string
): Promise<{ row: FriendRequest | null; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .or(
      `and(from_user_id.eq.${a},to_user_id.eq.${b}),and(from_user_id.eq.${b},to_user_id.eq.${a})`
    );
  if (error) return { row: null, error: error.message };
  const rows = (data as FriendRequest[]) || [];
  // Prefer accepted, then pending, then any
  const accepted = rows.find((r) => r.status === "accepted");
  if (accepted) return { row: accepted };
  const pending = rows.find((r) => r.status === "pending");
  if (pending) return { row: pending };
  return { row: rows[0] || null };
}

export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<{ error?: string; alreadyIncoming?: boolean }> {
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

  const { row: existing, error: findErr } = await findRelation(
    fromUserId,
    toUserId
  );
  if (findErr) return { error: findErr };

  if (existing) {
    if (existing.status === "accepted") {
      return { error: "Already friends" };
    }
    if (existing.status === "pending") {
      if (existing.from_user_id === fromUserId) {
        return { error: "Request already pending" };
      }
      return {
        error: "They already sent you a request — accept it in Friends",
        alreadyIncoming: true,
      };
    }
    // rejected / other → reopen as pending from current sender
    const { error } = await supabase
      .from("friend_requests")
      .update({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
    notifyFriendsUpdated();
    return {};
  }

  const { error } = await supabase.from("friend_requests").insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: "pending",
  });
  if (error) return { error: error.message };
  notifyFriendsUpdated();
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
  notifyFriendsUpdated();
  return {};
}

/** Sender cancels an outgoing pending request. */
export async function cancelFriendRequest(
  requestId: string,
  userId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: req, error: fetchErr } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };
  if (!req) return { error: "Request not found" };
  if (req.from_user_id !== userId) return { error: "Not your request" };
  if (req.status !== "pending") return { error: "Already handled" };

  const { error } = await supabase
    .from("friend_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) return { error: error.message };
  notifyFriendsUpdated();
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

export async function getFriendshipStatus(
  userId: string,
  otherId: string
): Promise<"none" | "pending_out" | "pending_in" | "friends"> {
  if (userId === otherId) return "none";
  const { row } = await findRelation(userId, otherId);
  if (!row || row.status === "rejected") return "none";
  if (row.status === "accepted") return "friends";
  if (row.status === "pending") {
    return row.from_user_id === userId ? "pending_out" : "pending_in";
  }
  return "none";
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

/** Remove an accepted friendship (either side). */
export async function removeFriend(
  userId: string,
  friendId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: rows, error: findErr } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(from_user_id.eq.${userId},to_user_id.eq.${friendId}),and(from_user_id.eq.${friendId},to_user_id.eq.${userId})`
    );
  if (findErr) return { error: findErr.message };
  if (!rows?.length) return { error: "Friendship not found" };
  const { error } = await supabase
    .from("friend_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .in(
      "id",
      rows.map((r) => r.id)
    );
  if (error) return { error: error.message };
  notifyFriendsUpdated();
  return {};
}
