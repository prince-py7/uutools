export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const APP_NAME = "UU Community";
export const DEFAULT_POPULAR_THRESHOLD = 10;
export const IMAGE_FINDER_API =
  process.env.NEXT_PUBLIC_IMAGE_API_URL ||
  "https://api.uuonline.in/api/student/image";
