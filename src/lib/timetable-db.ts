import { createClient } from "@/lib/supabase/client";
import { DAYS, SLOTS, validateTimetableSlot } from "@/lib/timetable";
import type {
  TimetableSlot,
  TimetableTemplate,
  TimetableTemplateSlot,
} from "@/lib/types";

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

export async function listTimetableTemplates(opts: {
  classId?: string | null;
  semesterId?: string | null;
  sectionId?: string | null;
  collegeId?: string | null;
}): Promise<{ templates: TimetableTemplate[]; error?: string }> {
  const supabase = createClient();
  let q = supabase
    .from("timetable_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  if (opts.collegeId) q = q.eq("college_id", opts.collegeId);
  if (opts.classId) q = q.eq("class_id", opts.classId);
  if (opts.semesterId) q = q.eq("semester_id", opts.semesterId);
  if (opts.sectionId) q = q.eq("section_id", opts.sectionId);
  const { data, error } = await q;
  if (error) return { templates: [], error: error.message };
  return { templates: (data as TimetableTemplate[]) || [] };
}

export async function fetchTemplateSlots(
  templateId: string
): Promise<{ slots: TimetableTemplateSlot[]; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("timetable_template_slots")
    .select("*")
    .eq("template_id", templateId);
  if (error) return { slots: [], error: error.message };
  return { slots: (data as TimetableTemplateSlot[]) || [] };
}

export type TemplateGrid = Record<string, string>;

export function emptyTemplateGrid(): TemplateGrid {
  const map: TemplateGrid = {};
  for (const d of DAYS) {
    for (const s of SLOTS) map[`${d}-${s}`] = "";
  }
  return map;
}

export function slotsToTemplateGrid(
  rows: { day_of_week: number; slot: number; subject_text: string }[]
): TemplateGrid {
  const map = emptyTemplateGrid();
  for (const row of rows) {
    map[`${row.day_of_week}-${row.slot}`] = row.subject_text || "";
  }
  return map;
}

/** Admin: create or replace a template + all 35 slots. */
export async function saveTimetableTemplate(opts: {
  id?: string | null;
  collegeId: string;
  classId: string;
  semesterId: string;
  sectionId: string;
  name: string;
  createdBy: string;
  grid: TemplateGrid;
}): Promise<{ template?: TimetableTemplate; error?: string }> {
  const supabase = createClient();
  const name = opts.name.trim();
  if (!name) return { error: "Template name required" };
  if (!opts.classId || !opts.semesterId || !opts.sectionId) {
    return { error: "Pick class, semester, and section" };
  }

  const slotRows: {
    day_of_week: number;
    slot: number;
    subject_text: string;
  }[] = [];
  for (const d of DAYS) {
    for (const s of SLOTS) {
      const subject_text = (opts.grid[`${d}-${s}`] || "").trim();
      const v = validateTimetableSlot({
        day_of_week: d,
        slot: s,
        subject_text,
      });
      if (!v.ok) return { error: v.error };
      slotRows.push({ day_of_week: d, slot: s, subject_text });
    }
  }

  let templateId = opts.id || null;

  if (templateId) {
    const { error } = await supabase
      .from("timetable_templates")
      .update({
        name,
        class_id: opts.classId,
        semester_id: opts.semesterId,
        section_id: opts.sectionId,
        college_id: opts.collegeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", templateId);
    if (error) return { error: error.message };
    await supabase
      .from("timetable_template_slots")
      .delete()
      .eq("template_id", templateId);
  } else {
    const { data, error } = await supabase
      .from("timetable_templates")
      .insert({
        college_id: opts.collegeId,
        class_id: opts.classId,
        semester_id: opts.semesterId,
        section_id: opts.sectionId,
        name,
        created_by: opts.createdBy,
      })
      .select("*")
      .single();
    if (error) return { error: error.message };
    templateId = (data as TimetableTemplate).id;
  }

  const { error: slotErr } = await supabase
    .from("timetable_template_slots")
    .insert(
      slotRows.map((r) => ({
        template_id: templateId!,
        day_of_week: r.day_of_week,
        slot: r.slot,
        subject_text: r.subject_text,
      }))
    );
  if (slotErr) return { error: slotErr.message };

  const { data: saved } = await supabase
    .from("timetable_templates")
    .select("*")
    .eq("id", templateId!)
    .maybeSingle();

  return { template: (saved as TimetableTemplate) || undefined };
}

export async function deleteTimetableTemplate(
  templateId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("timetable_templates")
    .delete()
    .eq("id", templateId);
  if (error) return { error: error.message };
  return {};
}

/** Copy every template cell into the user's personal timetable. */
export async function applyTemplateToUser(
  userId: string,
  templateId: string
): Promise<{ error?: string }> {
  const { slots, error } = await fetchTemplateSlots(templateId);
  if (error) return { error };
  for (const row of slots) {
    const res = await saveTimetableSlot(
      userId,
      row.day_of_week,
      row.slot,
      row.subject_text
    );
    if (res.error) return res;
  }
  // Clear cells that exist on user TT but are empty on template
  const filled = new Set(slots.map((s) => `${s.day_of_week}-${s.slot}`));
  for (const d of DAYS) {
    for (const s of SLOTS) {
      if (filled.has(`${d}-${s}`)) continue;
      const res = await saveTimetableSlot(userId, d, s, "");
      if (res.error) return res;
    }
  }
  return {};
}
