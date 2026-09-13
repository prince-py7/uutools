"use client";

import { LoadingState } from "@/components/ui/Loading";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.onboarding_complete) router.replace("/onboarding");
    else router.replace("/home");
  }, [ready, user, router]);

  return (
    <LoadingState label="Loading UNITIANS…" />
  );
}
