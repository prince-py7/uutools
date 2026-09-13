import { createClient } from "@/lib/supabase/client";
import { DEFAULT_POPULAR_THRESHOLD } from "@/lib/config";
import type {
  ClassRole,
  ClassRow,
  College,
  Profile,
  Section,
  Subject,
} from "@/lib/types";

export async function searchProfiles(opts: {
  collegeId: string;
  query?: string;
  classId?: string;
  sectionId?: string;
}): Promise<{ profiles: Profile[]; error?: string }> {
  const supabase = createClient();
  let q = supabase
    .from("profiles")
    .select("*")
    .eq("college_id", opts.collegeId)
    .eq("is_disabled", false)
    .order("display_name")
    .limit(40);

  if (opts.classId) q = q.eq("class_id", opts.classId);
  if (opts.sectionId) q = q.eq("section_id", opts.sectionId);
  if (opts.query?.trim()) {
    const term = `%${opts.query.trim()}%`;
    q = q.or(`username.ilike.${term},display_name.ilike.${term}`);
  } else if (!opts.classId && !opts.sectionId) {
    return { profiles: [] };
  }

  const { data, error } = await q;
  if (error) return { profiles: [], error: error.message };
  return { profiles: (data as Profile[]) || [] };
}

export async function fetchCollegeClasses(
  collegeId: string
): Promise<ClassRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("classes")
    .select("*")
    .eq("college_id", collegeId)
    .order("name");
  return (data as ClassRow[]) || [];
}

export async function fetchSections(classId: string): Promise<Section[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sections")
    .select("*")
    .eq("class_id", classId)
    .order("name");
  return (data as Section[]) || [];
}

export async function fetchSubjects(classId: string): Promise<Subject[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("subjects")
    .select("*")
    .eq("class_id", classId)
    .order("name");
  return (data as Subject[]) || [];
}

export async function fetchClassRolesForUsers(
  userIds: string[]
): Promise<ClassRole[]> {
  if (!userIds.length) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("class_roles")
    .select("*")
    .in("user_id", userIds);
  return (data as ClassRole[]) || [];
}

export async function fetchAppSetting(
  key: string
): Promise<{ value: unknown; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) return { value: null, error: error.message };
  return { value: data?.value ?? null };
}

export async function fetchPopularThreshold(): Promise<number> {
  const { value } = await fetchAppSetting("popular_like_threshold");
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_POPULAR_THRESHOLD;
}

export async function fetchFreeTierNotice(): Promise<string> {
  const { value } = await fetchAppSetting("free_tier_notice");
  if (typeof value === "string") return value;
  return "Supabase Free + Vercel Hobby: projects pause after inactivity; storage & bandwidth are limited. Non-commercial pilot only.";
}

export async function upsertAppSetting(
  key: string,
  value: unknown
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("app_settings").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return {};
}

export async function listColleges(): Promise<College[]> {
  const supabase = createClient();
  const { data } = await supabase.from("colleges").select("*").order("name");
  return (data as College[]) || [];
}

export async function listCollegeProfiles(
  collegeId: string
): Promise<Profile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("college_id", collegeId)
    .order("display_name");
  return (data as Profile[]) || [];
}

export async function listAllClassRoles(): Promise<ClassRole[]> {
  const supabase = createClient();
  const { data } = await supabase.from("class_roles").select("*");
  return (data as ClassRole[]) || [];
}
