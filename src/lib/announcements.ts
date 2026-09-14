import { createClient } from "@/lib/supabase/client";
import { getDemoState, saveDemoState } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/config";
import { insertDemoNotifications } from "@/lib/notifications";
import type {
  AppNotification,
  ClassAnnouncement,
  ClassRole,
  Profile,
} from "@/lib/types";

export function canSendClassAnnouncements(
  user: Profile | null,
  roles: ClassRole[],
  canPostOfficialDelegated = false
): boolean {
  if (!user) return false;
  if (user.is_admin) return true;
  if (canPostOfficialDelegated) return true;
  return roles.some(
    (r) =>
      r.user_id === user.id &&
      (r.role === "cr" || r.role === "professor") &&
      (!user.class_id || r.class_id === user.class_id)
  );
}

export async function fetchMyClassRoles(userId: string): Promise<ClassRole[]> {
  if (!isSupabaseConfigured()) {
    return getDemoState().roles.filter((r) => r.user_id === userId);
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("class_roles")
    .select("*")
    .eq("user_id", userId);
  return (data as ClassRole[]) || [];
}

async function recipientIds(
  classId: string,
  sectionId: string | null
): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return getDemoState()
      .profiles.filter(
        (p) =>
          p.class_id === classId &&
          (!sectionId || p.section_id === sectionId) &&
          !p.is_disabled
      )
      .map((p) => p.id);
  }
  const supabase = createClient();
  let q = supabase
    .from("profiles")
    .select("id")
    .eq("class_id", classId)
    .eq("is_disabled", false);
  if (sectionId) q = q.eq("section_id", sectionId);
  const { data } = await q;
  return ((data as { id: string }[]) || []).map((r) => r.id);
}

export async function createClassAnnouncement(opts: {
  author: Profile;
  body: string;
  imageUrl?: string | null;
  sectionOnly?: boolean;
}): Promise<{
  announcement?: ClassAnnouncement;
  error?: string;
  notified?: number;
}> {
  const body = opts.body.trim();
  if (!body && !opts.imageUrl) {
    return { error: "Write a message or add an image" };
  }
  if (!opts.author.class_id) {
    return { error: "Set your class in profile settings first" };
  }

  const roles = await fetchMyClassRoles(opts.author.id);
  if (!canSendClassAnnouncements(opts.author, roles)) {
    return { error: "Only CR or Professor can send class announcements" };
  }

  const classId = opts.author.class_id;
  const sectionId =
    opts.sectionOnly && opts.author.section_id
      ? opts.author.section_id
      : null;

  const announcement: ClassAnnouncement = {
    id: crypto.randomUUID(),
    class_id: classId,
    section_id: sectionId,
    author_id: opts.author.id,
    body,
    image_url: opts.imageUrl || null,
    created_at: new Date().toISOString(),
  };

  const title = "Class announcement";
  const preview =
    body.slice(0, 120) || (opts.imageUrl ? "Photo announcement" : "");

  if (!isSupabaseConfigured()) {
    const state = getDemoState() as ReturnType<typeof getDemoState> & {
      announcements?: ClassAnnouncement[];
    };
    saveDemoState({
      ...state,
      announcements: [announcement, ...(state.announcements || [])],
    } as never);

    const recipients = await recipientIds(classId, sectionId);
    const now = new Date().toISOString();
    const notes: AppNotification[] = recipients.map((uid) => ({
      id: crypto.randomUUID(),
      user_id: uid,
      type: "class_announcement",
      title,
      body: preview,
      ref_id: announcement.id,
      read_at: null,
      created_at: now,
    }));
    insertDemoNotifications(notes);
    return { announcement, notified: notes.length };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_announcements")
    .insert({
      class_id: classId,
      section_id: sectionId,
      author_id: opts.author.id,
      body,
      image_url: opts.imageUrl || null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  const saved = data as ClassAnnouncement;

  const recipients = await recipientIds(classId, sectionId);
  if (recipients.length) {
    await supabase.from("notifications").insert(
      recipients.map((uid) => ({
        user_id: uid,
        type: "class_announcement",
        title,
        body: preview,
        ref_id: saved.id,
      }))
    );
  }

  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: recipients,
        title,
        body: preview,
        url: "/notifications",
      }),
    });
  } catch {
    /* best-effort push */
  }

  return { announcement: saved, notified: recipients.length };
}
