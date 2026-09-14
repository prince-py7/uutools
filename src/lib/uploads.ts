/** Client-side upload MIME + size guards (also document Storage policies). */

export const STUDY_FILE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const STORY_MAX_BYTES = 25 * 1024 * 1024;
export const CHAT_MEDIA_MAX_BYTES = 15 * 1024 * 1024;

export const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const PDF_MIMES = ["application/pdf"] as const;

export const VIDEO_MIMES = ["video/mp4", "video/webm"] as const;

export const AUDIO_MIMES = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-m4a",
  "audio/aac",
] as const;

export type UploadKind =
  | "avatar"
  | "post-image"
  | "study-file"
  | "story"
  | "chat-media";

const ALLOWED: Record<UploadKind, readonly string[]> = {
  avatar: IMAGE_MIMES,
  "post-image": IMAGE_MIMES,
  "study-file": [...IMAGE_MIMES, ...PDF_MIMES],
  story: [...IMAGE_MIMES, ...VIDEO_MIMES],
  "chat-media": [...IMAGE_MIMES, ...AUDIO_MIMES],
};

const MAX: Record<UploadKind, number> = {
  avatar: AVATAR_MAX_BYTES,
  "post-image": STUDY_FILE_MAX_BYTES,
  "study-file": STUDY_FILE_MAX_BYTES,
  story: STORY_MAX_BYTES,
  "chat-media": CHAT_MEDIA_MAX_BYTES,
};

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  heic: "image/heic",
  heif: "image/heif",
};

/** Normalize browser quirks (empty type, image/jpg, extension-only). */
export function normalizeFileMime(file: File): string {
  let t = (file.type || "").toLowerCase().trim();
  if (t === "image/jpg") t = "image/jpeg";
  if (t === "audio/x-m4a") t = "audio/mp4";
  if (t) return t;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return EXT_MIME[ext] || "";
}

export function withNormalizedMime(file: File): File {
  const mime = normalizeFileMime(file);
  if (!mime || mime === file.type) return file;
  return new File([file], file.name, {
    type: mime,
    lastModified: file.lastModified,
  });
}

export function validateUpload(
  file: { type: string; size: number; name?: string },
  kind: UploadKind
):
  | { ok: true; mediaType: "image" | "pdf" | "video" | "audio" }
  | { ok: false; error: string } {
  const mime = normalizeFileMime(
    file instanceof File
      ? file
      : new File([], file.name || "file", { type: file.type })
  );
  if (mime === "image/heic" || mime === "image/heif") {
    return {
      ok: false,
      error: "HEIC photos are not supported. Please convert to JPG or PNG first.",
    };
  }
  const allowed = ALLOWED[kind];
  if (!mime || !allowed.includes(mime)) {
    return {
      ok: false,
      error: `Unsupported file type (${mime || file.type || "unknown"}). Try JPG, PNG, or WebP.`,
    };
  }
  if (file.size > MAX[kind]) {
    const mb = (MAX[kind] / (1024 * 1024)).toFixed(0);
    return { ok: false, error: `File too large. Max ${mb} MB.` };
  }
  if (PDF_MIMES.includes(mime as (typeof PDF_MIMES)[number])) {
    return { ok: true, mediaType: "pdf" };
  }
  if (VIDEO_MIMES.includes(mime as (typeof VIDEO_MIMES)[number])) {
    return { ok: true, mediaType: "video" };
  }
  if (AUDIO_MIMES.includes(mime as (typeof AUDIO_MIMES)[number])) {
    return { ok: true, mediaType: "audio" };
  }
  return { ok: true, mediaType: "image" };
}

export function mediaTypeFromMime(
  mime: string
): "image" | "pdf" | "video" | "audio" | "none" {
  const t = mime === "image/jpg" ? "image/jpeg" : mime;
  if (PDF_MIMES.includes(t as (typeof PDF_MIMES)[number])) return "pdf";
  if (VIDEO_MIMES.includes(t as (typeof VIDEO_MIMES)[number])) return "video";
  if (AUDIO_MIMES.includes(t as (typeof AUDIO_MIMES)[number])) return "audio";
  if (IMAGE_MIMES.includes(t as (typeof IMAGE_MIMES)[number])) return "image";
  return "none";
}

export function maxBytesForKind(kind: UploadKind): number {
  return MAX[kind];
}

/**
 * Compress images (when needed) then validate. Photos up to ~25 MB raw are
 * accepted and shrunk under the kind limit.
 */
export async function prepareUploadFile(
  file: File,
  kind: UploadKind
): Promise<
  | { file: File; mediaType: "image" | "pdf" | "video" | "audio" }
  | { error: string }
> {
  let next = withNormalizedMime(file);
  if (next.type.startsWith("image/") && next.type !== "image/gif") {
    const { compressImageFile, compressTargetBytes } = await import(
      "@/lib/image-compress"
    );
    const target = Math.min(compressTargetBytes(kind), MAX[kind]);
    if (next.size > target || next.size > MAX[kind]) {
      const compressed = await compressImageFile(next, { maxBytes: target });
      if ("error" in compressed) return { error: compressed.error };
      next = compressed.file;
    }
  }
  const v = validateUpload(next, kind);
  if (!v.ok) return { error: v.error };
  return { file: next, mediaType: v.mediaType };
}
