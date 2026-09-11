import { createClient } from "@/lib/supabase/client";
import { validateUpload, type UploadKind } from "@/lib/uploads";

const BUCKET: Record<UploadKind, string> = {
  avatar: "avatars",
  "post-image": "post-media",
  "study-file": "study-files",
  story: "stories",
};

/** Upload to Supabase Storage when configured; callers should fall back to demo data URLs. */
export async function uploadToSupabase(
  file: File,
  kind: UploadKind,
  userId: string
): Promise<{ url: string; mediaType: "image" | "pdf" | "video" } | { error: string }> {
  const v = validateUpload(file, kind);
  if (!v.ok) return { error: v.error };
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET[kind]).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from(BUCKET[kind]).getPublicUrl(path);
  return { url: data.publicUrl, mediaType: v.mediaType };
}
