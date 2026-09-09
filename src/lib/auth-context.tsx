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
  demoSignup,
  demoUpdateProfile,
  getDemoState,
} from "@/lib/demo-store";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  ready: boolean;
  demoMode: boolean;
  user: Profile | null;
  refresh: () => void;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  signup: (opts: {
    username: string;
    password: string;
    displayName: string;
  }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoMode = !isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);

  const refresh = useCallback(() => {
    if (demoMode) {
      setUser(demoCurrentUser());
      setReady(true);
      return;
    }
    // Supabase path hydrated client-side by pages that need it
    setReady(true);
  }, [demoMode]);

  useEffect(() => {
    refresh();
    if (!demoMode) return;
    const onUpdate = () => setUser(demoCurrentUser());
    window.addEventListener("uu-demo-updated", onUpdate);
    return () => window.removeEventListener("uu-demo-updated", onUpdate);
  }, [demoMode, refresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      if (demoMode) {
        const res = demoLogin(username, password);
        if (res.error) return { error: res.error };
        setUser(res.profile ?? null);
        return {};
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const email = `${username.toLowerCase()}@users.uu.community`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      setUser((data as Profile) ?? null);
      return {};
    },
    [demoMode]
  );

  const signup = useCallback(
    async (opts: {
      username: string;
      password: string;
      displayName: string;
    }) => {
      if (demoMode) {
        const res = demoSignup(opts);
        if (res.error) return { error: res.error };
        setUser(res.profile ?? null);
        return {};
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const email = `${opts.username.toLowerCase()}@users.uu.community`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: opts.password,
        options: {
          data: {
            username: opts.username.toLowerCase(),
            full_name: opts.displayName,
          },
        },
      });
      if (error) return { error: error.message };
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          username: opts.username.toLowerCase(),
          display_name: opts.displayName,
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
    }),
    [ready, demoMode, user, refresh, login, signup, logout, updateProfile]
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
