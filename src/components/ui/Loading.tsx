"use client";

export function Spinner({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

/** Full-area loading state with spinner + label. */
export function LoadingState({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-sm text-[var(--muted)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <Spinner size={28} />
      <p>{label}</p>
    </div>
  );
}

/** Compact inline loader (lists / panels). */
export function LoadingInline({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 p-4 text-sm text-[var(--muted)]"
      role="status"
      aria-live="polite"
    >
      <Spinner size={16} />
      <span>{label}</span>
    </div>
  );
}

/** Feed/list skeleton placeholders. */
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-[var(--line)] bg-[var(--bg-card)] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--bg-soft)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-[var(--bg-soft)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--bg-soft)]" />
            </div>
          </div>
          <div className="mt-3 h-24 rounded-lg bg-[var(--bg-soft)]" />
        </div>
      ))}
    </div>
  );
}
