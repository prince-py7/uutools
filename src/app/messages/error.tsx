"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Messages error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">Messages hit a snag</h1>
      <p className="text-sm text-[var(--muted)]">
        {error.message || "A client error occurred while loading chat."} Try
        again, or reopen Messages from Home.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/home" className="btn btn-ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
