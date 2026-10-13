import { demoFileToDataUrl } from "@/lib/demo-store";
import { uploadToSupabase } from "@/lib/supabase/upload";
import { fetchUniversityPhotoFile } from "@/lib/university-photo";

const triedKey = (userId: string, enrollmentId: string) =>
  `uu-avatar-auto-${userId}-${enrollmentId.trim().toLowerCase()}`;

/** Avoid hammering the university API after a failed attempt this session. */
export function markAvatarAutoTried(userId: string, enrollmentId: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(triedKey(userId, enrollmentId), "1");
  } catch {
    /* ignore */
  }
}

export function wasAvatarAutoTried(userId: string, enrollmentId: string) {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(triedKey(userId, enrollmentId)) === "1";
  } catch {
    return false;
  }
}

/**
 * If the user has a College ID / UUID but no DP, fetch the same Image Finder
 * photo and upload it as their avatar.
 */
export async function ensureAvatarFromEnrollment(opts: {
  userId: string;
  enrollmentId: string | null | undefined;
  avatarUrl: string | null | undefined;
  demoMode: boolean;
  /** Force retry even if we already tried this session. */
  force?: boolean;
  updateAvatar: (url: string) => Promise<unknown>;
}): Promise<"set" | "skipped" | "failed"> {
  const id = opts.enrollmentId?.trim();
  if (!id) return "skipped";
  if (opts.avatarUrl) return "skipped";
  if (!opts.force && wasAvatarAutoTried(opts.userId, id)) return "skipped";

  markAvatarAutoTried(opts.userId, id);

  const photo = await fetchUniversityPhotoFile(id);
  if ("error" in photo) return "failed";

  if (opts.demoMode) {
    const data = await demoFileToDataUrl(photo.file, "avatar");
    if ("error" in data) return "failed";
    await opts.updateAvatar(data.url);
    return "set";
  }

  const up = await uploadToSupabase(photo.file, "avatar", opts.userId);
  if ("error" in up) return "failed";
  await opts.updateAvatar(up.url);
  return "set";
}
