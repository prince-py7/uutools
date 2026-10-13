"use client";

import Image from "next/image";
import type { Badge } from "@/lib/types";

export function BadgeList({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {badges.map((b) => (
        <span key={`${b.kind}-${b.label}`} className={`badge badge-${b.kind}`}>
          {b.label}
        </span>
      ))}
    </span>
  );
}

function isOptimizableAvatar(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith("supabase.co") || host === "api.uuonline.in";
  } catch {
    return false;
  }
}

export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] text-center font-semibold text-[var(--accent)]"
      style={{ width: size, height: size, lineHeight: `${size}px`, fontSize: size * 0.4 }}
    >
      {url ? (
        isOptimizableAvatar(url) ? (
          <Image
            src={url}
            alt={name}
            width={size}
            height={size}
            className="h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )
      ) : (
        initial
      )}
    </div>
  );
}
