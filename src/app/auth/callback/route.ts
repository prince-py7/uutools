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
    }
  }

  // Prevent open redirects
  if (!next.startsWith("/")) next = "/home";

  return NextResponse.redirect(`${origin}${next}`);
}
