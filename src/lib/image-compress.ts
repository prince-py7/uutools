/** Browser-side image compression so photos up to ~25 MB input fit under kind limits. */

const RAW_IMAGE_ACCEPT_MAX = 25 * 1024 * 1024;

export type CompressOpts = {
  /** Target max file size in bytes after compression. */
  maxBytes: number;
  /** Longest edge in px (default 1920). */
  maxEdge?: number;
  /** Starting JPEG quality 0–1 (default 0.85). */
  quality?: number;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

/**
 * Compress an image File toward `maxBytes`. GIFs are returned unchanged
 * (animation). Non-images are returned unchanged. Oversized raw images
 * (>25 MB) are rejected before decode.
 */
export async function compressImageFile(
  file: File,
  opts: CompressOpts
): Promise<{ file: File } | { error: string }> {
  if (!file.type.startsWith("image/")) return { file };
  if (file.type === "image/gif") return { file };
  if (file.size > RAW_IMAGE_ACCEPT_MAX) {
    return {
      error: "Image too large to process. Max 25 MB before compression.",
    };
  }
  if (file.size <= opts.maxBytes) return { file };

  try {
    const img = await loadImage(file);
    const maxEdge = opts.maxEdge ?? 1920;
    let { width, height } = img;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { error: "Canvas unavailable for compression" };
    ctx.drawImage(img, 0, 0, width, height);

    const outType =
      file.type === "image/png" || file.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";
    let quality = opts.quality ?? 0.85;
    let blob: Blob | null = null;

    for (let i = 0; i < 8; i++) {
      blob = await canvasToBlob(canvas, outType, quality);
      if (!blob) break;
      if (blob.size <= opts.maxBytes) break;
      quality = Math.max(0.45, quality - 0.1);
      if (quality <= 0.45 && blob.size > opts.maxBytes) {
        // Shrink dimensions further
        width = Math.max(1, Math.round(width * 0.85));
        height = Math.max(1, Math.round(height * 0.85));
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        quality = 0.8;
      }
    }

    if (!blob) return { error: "Compression failed" };
    if (blob.size > opts.maxBytes) {
      return {
        error: `Could not compress under ${(opts.maxBytes / (1024 * 1024)).toFixed(0)} MB. Try a smaller photo.`,
      };
    }

    const ext = outType === "image/webp" ? "webp" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;
    return {
      file: new File([blob], name, { type: outType, lastModified: Date.now() }),
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Image compression failed",
    };
  }
}

/** Target compressed size by upload kind (under the hard validate limit). */
export function compressTargetBytes(
  kind: "avatar" | "post-image" | "study-file" | "story" | "chat-media"
): number {
  switch (kind) {
    case "avatar":
      return Math.floor(1.5 * 1024 * 1024);
    case "post-image":
      return 9 * 1024 * 1024;
    case "study-file":
      return 9 * 1024 * 1024;
    case "story":
      return 8 * 1024 * 1024;
    case "chat-media":
      return 8 * 1024 * 1024;
    default:
      return 9 * 1024 * 1024;
  }
}
