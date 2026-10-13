import { IMAGE_FINDER_API } from "@/lib/config";
import type { College } from "@/lib/types";

/** United University (and slug variants) — student photo API applies here. */
export function isUnitedUniversity(
  college: Pick<College, "name" | "slug"> | null | undefined
): boolean {
  if (!college) return false;
  const slug = (college.slug || "").toLowerCase();
  const name = (college.name || "").toLowerCase();
  return (
    slug === "united-university" ||
    slug.includes("united") ||
    name.includes("united university")
  );
}

export function universityPhotoUrl(uuid: string): string {
  const base = IMAGE_FINDER_API.replace(/\/$/, "");
  return `${base}/${encodeURIComponent(uuid.trim())}`;
}

/**
 * Fetch student photo from UU API by enrollment / UUID.
 * Returns a File ready for avatar upload, or an error.
 */
export async function fetchUniversityPhotoFile(
  uuid: string
): Promise<{ file: File } | { error: string }> {
  const id = uuid.trim();
  if (!id) return { error: "Enter your College ID / UUID first" };

  const url = universityPhotoUrl(id);
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "blob";
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.size > 0) {
          resolve(xhr.response as Blob);
        } else reject(new Error("empty"));
      };
      xhr.onerror = () => reject(new Error("network"));
      xhr.send();
    });

    if (!blob.type.startsWith("image/") && blob.type !== "application/octet-stream") {
      return { error: "Image not available for this ID" };
    }
    const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    const file = new File([blob], `uu-${id}.jpg`, { type });
    return { file };
  } catch {
    // Fallback: try as image element load (CORS may still allow img, not XHR)
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image"));
        img.src = url;
      });
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) return { error: "Image not available for this ID" };
      const blob = await res.blob();
      const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
      return { file: new File([blob], `uu-${id}.jpg`, { type }) };
    } catch {
      return { error: "Image not available for this ID" };
    }
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}
