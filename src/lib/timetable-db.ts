import { createClient } from "@/lib/supabase/client";
import { validateTimetableSlot } from "@/lib/timetable";
import type { TimetableSlot } from "@/lib/types";

export async function fetchTimetable(
  userId: string
): Promise<{ slots: TimetableSlot[]; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("timetables")
    .select("*")
    .eq("user_id", userId);
  if (error) return { slots: [], error: error.message };
  return { slots: (data as TimetableSlot[]) || [] };
}

export async function saveTimetableSlot(
  userId: string,
  day_of_week: number,
  slot: number,
  subject_text: string
): Promise<{ error?: string }> {
  const v = validateTimetableSlot({ day_of_week, slot, subject_text });
  if (!v.ok) return { error: v.error };
  const supabase = createClient();
  const { error } = await supabase.from("timetables").upsert(
    {
      user_id: userId,
      day_of_week,
      slot,
      subject_text,
    },
    { onConflict: "user_id,day_of_week,slot" }
  );
  if (error) return { error: error.message };
  return {};
}
