"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured } from "@/lib/config";
import {
  demoCurrentUser,
  demoLogin,
  demoLogout,
  demoRequestEmailVerification,
  demoSignup,
  demoUpdateProfile,
  getDemoState,
} from "@/lib/demo-store";
import { validateUsername } from "@/lib/username";
import { canSendVerification } from "@/lib/verification";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  ready: boolean;
  demoMode: boolean;
  user: Profile | null;
  refresh: () => void;
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  signup: (opts: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile | null>;
  requestEmailVerification: () => Promise<{ error?: string; message?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoMode = !isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);

  const loadSupabaseUser = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) {
      setUser(null);
      setReady(true);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setUser((profile as Profile) ?? null);
    setReady(true);
  }, []);

  const refresh = useCallback(() => {
    if (demoMode) {
      setUser(demoCurrentUser());
      setReady(true);
      return;
    }
    void loadSupabaseUser();
  }, [demoMode, loadSupabaseUser]);

  useEffect(() => {
    refresh();
    if (demoMode) {
      const onUpdate = () => setUser(demoCurrentUser());
      window.addEventListener("uu-demo-updated", onUpdate);
      return () => window.removeEventListener("uu-demo-updated", onUpdate);
    }

    let unsub: (() => void) | undefined;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange(() => {
        void loadSupabaseUser();
      });
      unsub = () => data.subscription.unsubscribe();
    })();
    return () => unsub?.();
  }, [demoMode, refresh, loadSupabaseUser]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const raw = identifier.trim();
      if (demoMode) {
        const res = demoLogin(raw, password);
        if (res.error) return { error: res.error };
        setUser(res.profile ?? null);
        return {};
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      let email = raw.toLowerCase();
      if (!isEmail(raw)) {
        const { data, error } = await supabase.rpc("email_for_username", {
          uname: raw.toLowerCase(),
        });
        if (error || !data) {
          return { error: "User not found" };
        }
        email = String(data);
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      if ((profile as Profile | null)?.is_disabled) {
        await supabase.auth.signOut();
        return { error: "Account disabled" };
      }
      setUser((profile as Profile) ?? null);
      return {};
    },
    [demoMode]
  );

  const signup = useCallback(
    async (opts: {
      username: string;
      email: string;
      password: string;
      displayName: string;
    }) => {
      const parsed = validateUsername(opts.username);
      if (!parsed.ok) return { error: parsed.error };
      const username = parsed.username;
      const email = opts.email.trim().toLowerCase();

      if (demoMode) {
        const res = demoSignup({
          username,
          email,
          password: opts.password,
          displayName: opts.displayName,
        });
        if (res.error) return { error: res.error };
        setUser(res.profile ?? null);
        return {};
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data: takenUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (takenUser) return { error: "Username taken" };

      const { data, error } = await supabase.auth.signUp({
        email,
        password: opts.password,
        options: {
          data: {
            username,
            full_name: opts.displayName || username,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) return { error: error.message };

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          username,
          email,
          email_verified: Boolean(data.user.email_confirmed_at),
          display_name: opts.displayName || username,
        });
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
        setUser(profile as Profile);
      }
      return {};
    },
    [demoMode]
  );

  const logout = useCallback(async () => {
    if (demoMode) {
      demoLogout();
      setUser(null);
      return;
    }
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    setUser(null);
  }, [demoMode]);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return null;
      if (demoMode) {
        const updated = demoUpdateProfile(user.id, patch);
        setUser(updated);
        return updated;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select("*")
        .single();
      if (error) return null;
      setUser(data as Profile);
      return data as Profile;
    },
    [demoMode, user]
  );

  const requestEmailVerification = useCallback(async () => {
    if (!user) return { error: "Not signed in" };
    const gate = canSendVerification(user);
    if (!gate.ok) return { error: gate.error };

    if (demoMode) {
      const res = demoRequestEmailVerification(user.id);
      if (res.error) return { error: res.error };
      setUser(res.profile ?? null);
      return { message: "Email verified (demo). Full access was already available." };
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    await supabase
      .from("profiles")
      .update({ last_verification_sent_at: new Date().toISOString() })
      .eq("id", user.id);
    setUser({
      ...user,
      last_verification_sent_at: new Date().toISOString(),
    });
    return {
      message:
        "Verification email sent. You already have full access — verify when you can.",
    };
  }, [demoMode, user]);

  const value = useMemo(
    () => ({
      ready,
      demoMode,
      user,
      refresh,
      login,
      signup,
      logout,
      updateProfile,
      requestEmailVerification,
    }),
    [
      ready,
      demoMode,
      user,
      refresh,
      login,
      signup,
      logout,
      updateProfile,
      requestEmailVerification,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useDemoCatalog() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    window.addEventListener("uu-demo-updated", onUpdate);
    return () => window.removeEventListener("uu-demo-updated", onUpdate);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getDemoState(), [tick]);
}
