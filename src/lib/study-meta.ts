import type { StudyType } from "@/lib/types";

export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  unit: "Unit / Notes",
  assignment: "Assignment",
  practical: "Practical",
  whiteboard: "Whiteboard",
  other: "Other",
};

export function studyTypeLabel(type: StudyType | string | null | undefined): string {
  if (!type) return "";
  return STUDY_TYPE_LABELS[type as StudyType] || type;
}

/** Prefer stored media_name; otherwise try a readable name from the URL. */
export function studyFileDisplayName(
  mediaName: string | null | undefined,
  mediaUrl: string | null | undefined,
  mediaType: string | null | undefined
): string {
  const stored = mediaName?.trim();
  if (stored) return stored;

  if (mediaUrl) {
    try {
      const path = decodeURIComponent(new URL(mediaUrl, "https://local").pathname);
      const base = path.split("/").filter(Boolean).pop() || "";
      // Skip storage paths like "1739123456789.pdf"
      if (base && !/^\d{10,}\.[a-z0-9]+$/i.test(base)) {
        // "uuid/1739_notes.pdf" → keep after underscore if present
        const afterTs = base.replace(/^\d{10,}_/, "");
        if (afterTs && afterTs !== base) return afterTs;
        if (!/^[0-9a-f-]{36}/i.test(base)) return base;
      }
    } catch {
      /* ignore */
    }
  }

  if (mediaType === "pdf") return "PDF attachment";
  if (mediaType === "image") return "Image attachment";
  return "Attachment";
}
