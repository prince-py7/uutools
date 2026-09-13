import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Body = {
  userIds?: string[];
  title?: string;
  body?: string;
  url?: string;
};

export async function POST(req: NextRequest) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@unitians.app";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ ok: false, skipped: "vapid_missing" });
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, skipped: "supabase_missing" });
  }

  let payload: Body;
  try {
    payload = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];
  if (!userIds.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
  } catch {
    return NextResponse.json({ ok: false, skipped: "web_push_not_installed" });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const message = JSON.stringify({
    title: payload.title || "UNITIANS",
    body: payload.body || "",
    url: payload.url || "/notifications",
  });

  let sent = 0;
  for (const row of subs || []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        message
      );
      sent += 1;
    } catch {
      /* drop dead subscriptions silently */
    }
  }

  return NextResponse.json({ ok: true, sent });
}
