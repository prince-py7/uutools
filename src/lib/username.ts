/** Username validation & uniqueness helpers (pure). */

export const USERNAME_REGEX = /^[a-z0-9._]{3,24}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): { ok: true; username: string } | { ok: false; error: string } {
  const username = normalizeUsername(raw);
  if (!USERNAME_REGEX.test(username)) {
    return {
      ok: false,
      error: "Username must be 3–24 chars (letters, numbers, . _)",
    };
  }
  return { ok: true, username };
}

export function isUsernameTaken(
  username: string,
  existingUsernames: string[],
  exceptUserId?: string,
  profiles?: { id: string; username: string }[]
): boolean {
  const needle = normalizeUsername(username);
  if (profiles && exceptUserId) {
    return profiles.some(
      (p) => p.id !== exceptUserId && p.username.toLowerCase() === needle
    );
  }
  return existingUsernames.some((u) => u.toLowerCase() === needle);
}
