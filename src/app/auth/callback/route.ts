import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/home";

  // Recovery / invite links that omit next should land on password update.
  const type = searchParams.get("type");
  if (!searchParams.get("next") && (type === "recovery" || type === "invite")) {
    next = "/forgot-password?mode=update";
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);

      // After Google / magic-link: finish onboarding if needed, pull avatar once.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, onboarding_complete, avatar_url, display_name")
          .eq("id", user.id)
          .maybeSingle();

        const meta = user.user_metadata || {};
        const picture =
          (typeof meta.avatar_url === "string" && meta.avatar_url) ||
          (typeof meta.picture === "string" && meta.picture) ||
          null;
        const fullName =
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          null;

        if (profile) {
          const patch: Record<string, string> = {};
          if (!profile.avatar_url && picture) patch.avatar_url = picture;
          if (
            fullName &&
            (!profile.display_name ||
              profile.display_name === profile.id.slice(0, 8))
          ) {
            patch.display_name = fullName;
          }
          if (Object.keys(patch).length) {
            await supabase.from("profiles").update(patch).eq("id", user.id);
          }
          if (!profile.onboarding_complete) {
            next = "/onboarding";
          }
        } else {
          next = "/onboarding";
        }
      }
    }
  }

  // Prevent open redirects
  if (!next.startsWith("/")) next = "/home";

  return NextResponse.redirect(`${origin}${next}`);
}
