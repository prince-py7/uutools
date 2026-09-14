const KEY = "unitians-push-enabled";

export function getPushEnabledPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setPushEnabledPref(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function shouldShowPushPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted" || getPushEnabledPref()) {
    return false;
  }
  try {
    if (localStorage.getItem("unitians-push-prompt-dismissed") === "1") {
      return false;
    }
  } catch {
    /* ignore */
  }
  return Notification.permission !== "denied";
}
