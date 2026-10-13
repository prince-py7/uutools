import { createClient } from "@/lib/supabase/client";
import { prepareUploadFile, type UploadKind } from "@/lib/uploads";

const BUCKET: Record<UploadKind, string> = {
  avatar: "avatars",
  "post-image": "post-media",
  "study-file": "study-files",
  story: "stories",
  "chat-media": "post-media",
};

export type UploadMediaType = "image" | "pdf" | "video" | "audio";

/** Upload an already-validated/compressed file (skip second prepare). */
export async function uploadPreparedFile(
  file: File,
  kind: UploadKind,
  userId: string,
  mediaType: UploadMediaType
): Promise<{ url: string; mediaType: UploadMediaType; fileName: string } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerId = user?.id || userId;
  if (!ownerId) return { error: "Not signed in — cannot upload" };

  const ext = file.name.split(".").pop() || "bin";
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60)
    .replace(/^_|_$/g, "");
  const path = `${ownerId}/${Date.now()}_${safeBase || "file"}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET[kind]).upload(path, file, {
    contentType: (file.type || "application/octet-stream").split(";")[0],
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) {
    const hint =
      /bucket|not found|row-level security|policy|violates/i.test(error.message)
        ? " Check Storage buckets/policies (re-run supabase/storage.sql in Supabase SQL Editor)."
        : "";
    return { error: `${error.message}${hint}` };
  }
  const { data } = supabase.storage.from(BUCKET[kind]).getPublicUrl(path);
  return {
    url: data.publicUrl,
    mediaType,
    fileName: file.name,
  };
}

/** Upload to Supabase Storage when configured; callers should fall back to demo data URLs. */
export async function uploadToSupabase(
  file: File,
  kind: UploadKind,
  userId: string,
  opts?: {
    /** Skip compress/validate when already done on pick. */
    alreadyPrepared?: boolean;
    mediaType?: UploadMediaType;
  }
): Promise<
  | { url: string; mediaType: UploadMediaType; fileName: string }
  | { error: string }
> {
  if (opts?.alreadyPrepared && opts.mediaType) {
    return uploadPreparedFile(file, kind, userId, opts.mediaType);
  }
  const prepared = await prepareUploadFile(file, kind);
  if ("error" in prepared) return { error: prepared.error };
  return uploadPreparedFile(prepared.file, kind, userId, prepared.mediaType);
}
