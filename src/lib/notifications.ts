import { createClient } from "@/lib/supabase/client";
import { getDemoState, saveDemoState } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/config";
import type { AppNotification } from "@/lib/types";

type DemoWithNotes = ReturnType<typeof getDemoState> & {
  notifications?: AppNotification[];
};

function demoList(userId: string): AppNotification[] {
  const state = getDemoState() as DemoWithNotes;
  return (state.notifications || [])
    .filter((n) => n.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listNotifications(
  userId: string
): Promise<{ items: AppNotification[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { items: demoList(userId) };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { items: [], error: error.message };
  return { items: (data as AppNotification[]) || [] };
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return demoList(userId).filter((n) => !n.read_at).length;
  }
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) {
    const state = getDemoState() as DemoWithNotes;
    saveDemoState({
      ...state,
      notifications: (state.notifications || []).map((n) =>
        n.id === notificationId && n.user_id === userId
          ? { ...n, read_at: new Date().toISOString() }
          : n
      ),
    } as never);
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) return { error: error.message };
  return {};
}

export async function markAllNotificationsRead(
  userId: string
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) {
    const state = getDemoState() as DemoWithNotes;
    const now = new Date().toISOString();
    saveDemoState({
      ...state,
      notifications: (state.notifications || []).map((n) =>
        n.user_id === userId && !n.read_at ? { ...n, read_at: now } : n
      ),
    } as never);
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return { error: error.message };
  return {};
}

export function insertDemoNotifications(items: AppNotification[]) {
  const state = getDemoState() as DemoWithNotes;
  saveDemoState({
    ...state,
    notifications: [...items, ...(state.notifications || [])],
  } as never);
}
