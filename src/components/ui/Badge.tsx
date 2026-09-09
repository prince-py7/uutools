"use client";

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
      className="shrink-0 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] text-center font-semibold text-[var(--accent)]"
      style={{ width: size, height: size, lineHeight: `${size}px`, fontSize: size * 0.4 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
