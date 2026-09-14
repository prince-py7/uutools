"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePushNotifications(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return { ok: false, error: "Push is not supported on this device" };
  }
  if (!VAPID_PUBLIC) {
    // Soft-enable: browser permission + SW without remote Web Push.
    // Generate keys: npx web-push generate-vapid-keys  (see docs/SETUP.md)
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Notification permission was denied" };
    }
    await ensureServiceWorker();
    try {
      localStorage.setItem(
        `unitians-push:${userId}`,
        JSON.stringify(["local-no-vapid"])
      );
    } catch {
      /* ignore */
    }
    return { ok: true };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Notification permission was denied" };
  }
  const reg = await ensureServiceWorker();
  if (!reg) return { ok: false, error: "Could not register service worker" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    });
  }
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "Invalid push subscription" };
  }

  if (!isSupabaseConfigured()) {
    try {
      const key = `unitians-push:${userId}`;
      const raw = localStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      if (!list.includes(json.endpoint)) {
        localStorage.setItem(key, JSON.stringify([...list, json.endpoint]));
      }
    } catch {
      /* ignore */
    }
    return { ok: true };
  }

  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
