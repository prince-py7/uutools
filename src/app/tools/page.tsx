"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ToolsIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tools/image-finder");
  }, [router]);
  return null;
}
