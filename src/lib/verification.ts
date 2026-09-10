/** Non-blocking email verification helpers with send throttle. */

export const VERIFICATION_THROTTLE_MS = 60_000; // 60s between sends

export type VerificationState = {
  email_verified: boolean;
  last_verification_sent_at?: string | null;
};

export function canSendVerification(
  state: VerificationState,
  now: Date = new Date()
): { ok: true } | { ok: false; error: string; retryAfterMs?: number } {
  if (state.email_verified) {
    return { ok: false, error: "Email already verified" };
  }
  if (state.last_verification_sent_at) {
    const last = new Date(state.last_verification_sent_at).getTime();
    const elapsed = now.getTime() - last;
    if (elapsed < VERIFICATION_THROTTLE_MS) {
      return {
        ok: false,
        error: "Please wait before requesting another verification email",
        retryAfterMs: VERIFICATION_THROTTLE_MS - elapsed,
      };
    }
  }
  return { ok: true };
}

/** Access is never gated on verification. */
export function hasFullAccess(_state?: VerificationState): boolean {
  void _state;
  return true;
}

export function verificationReminder(state: VerificationState): string | null {
  if (state.email_verified) return null;
  return "Verify your email when you can — you already have full access.";
}
