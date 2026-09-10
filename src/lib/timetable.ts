export const DAYS = [1, 2, 3, 4, 5] as const; // Mon–Fri
export const SLOTS = [1, 2, 3, 4, 5, 6, 7] as const;

export type TimetableInput = {
  day_of_week: number;
  slot: number;
  subject_text: string;
};

export function validateTimetableSlot(
  input: TimetableInput
): { ok: true } | { ok: false; error: string } {
  if (!DAYS.includes(input.day_of_week as (typeof DAYS)[number])) {
    return { ok: false, error: "day_of_week must be 1–5 (Mon–Fri)" };
  }
  if (!SLOTS.includes(input.slot as (typeof SLOTS)[number])) {
    return { ok: false, error: "slot must be 1–7" };
  }
  if (input.subject_text.length > 80) {
    return { ok: false, error: "Subject text max 80 characters" };
  }
  return { ok: true };
}

export function validateTimetableGrid(
  slots: TimetableInput[]
): { ok: true } | { ok: false; error: string } {
  const seen = new Set<string>();
  for (const s of slots) {
    const v = validateTimetableSlot(s);
    if (!v.ok) return v;
    const key = `${s.day_of_week}:${s.slot}`;
    if (seen.has(key)) {
      return { ok: false, error: `Duplicate slot ${key}` };
    }
    seen.add(key);
  }
  return { ok: true };
}
