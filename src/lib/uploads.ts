/** Client-side upload MIME + size guards (also document Storage policies). */

export const STUDY_FILE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const STORY_MAX_BYTES = 25 * 1024 * 1024;

export const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const PDF_MIMES = ["application/pdf"] as const;

export const VIDEO_MIMES = ["video/mp4", "video/webm"] as const;

export type UploadKind = "avatar" | "post-image" | "study-file" | "story";

const ALLOWED: Record<UploadKind, readonly string[]> = {
  avatar: IMAGE_MIMES,
  "post-image": IMAGE_MIMES,
  "study-file": [...IMAGE_MIMES, ...PDF_MIMES],
  story: [...IMAGE_MIMES, ...VIDEO_MIMES],
};

const MAX: Record<UploadKind, number> = {
  avatar: AVATAR_MAX_BYTES,
  "post-image": STUDY_FILE_MAX_BYTES,
  "study-file": STUDY_FILE_MAX_BYTES,
  story: STORY_MAX_BYTES,
};

export function validateUpload(
  file: { type: string; size: number; name?: string },
  kind: UploadKind
): { ok: true; mediaType: "image" | "pdf" | "video" } | { ok: false; error: string } {
  const allowed = ALLOWED[kind];
  if (!allowed.includes(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type (${file.type || "unknown"}). Allowed: ${allowed.join(", ")}`,
    };
  }
  if (file.size > MAX[kind]) {
    const mb = (MAX[kind] / (1024 * 1024)).toFixed(0);
    return { ok: false, error: `File too large. Max ${mb} MB for ${kind}.` };
  }
  if (PDF_MIMES.includes(file.type as (typeof PDF_MIMES)[number])) {
    return { ok: true, mediaType: "pdf" };
  }
  if (VIDEO_MIMES.includes(file.type as (typeof VIDEO_MIMES)[number])) {
    return { ok: true, mediaType: "video" };
  }
  return { ok: true, mediaType: "image" };
}

export function mediaTypeFromMime(
  mime: string
): "image" | "pdf" | "video" | "none" {
  if (PDF_MIMES.includes(mime as (typeof PDF_MIMES)[number])) return "pdf";
  if (VIDEO_MIMES.includes(mime as (typeof VIDEO_MIMES)[number])) return "video";
  if (IMAGE_MIMES.includes(mime as (typeof IMAGE_MIMES)[number])) return "image";
  return "none";
}
