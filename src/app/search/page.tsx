"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Badge";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { classSectionLabel } from "@/lib/badges";

export default function SearchPage() {
  const { user, ready } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  const classes = catalog.classes.filter(
    (c) => c.college_id === (user?.college_id || catalog.colleges[0]?.id)
  );
  const sections = catalog.sections.filter((s) => s.class_id === classId);

  const results = useMemo(() => {
    return catalog.profiles.filter((p) => {
      if (p.is_disabled) return false;
      if (classId && p.class_id !== classId) return false;
      if (sectionId && p.section_id !== sectionId) return false;
      if (!q.trim()) return Boolean(classId);
      const hay = `${p.username} ${p.display_name}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [catalog.profiles, q, classId, sectionId]);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-4 md:px-0">
        <h1 className="text-2xl font-bold">
          Search
        </h1>
        <input
          className="input"
          placeholder="Search username or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="input"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId("");
            }}
          >
            <option value="">Filter by class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={!classId}
          >
            <option value="">Section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Tip: pick BCA + B to list all registered students in that section without typing.
        </p>
        <div className="space-y-2">
          {results.map((p) => {
            const cls = catalog.classes.find((c) => c.id === p.class_id);
            const sec = catalog.sections.find((s) => s.id === p.section_id);
            return (
              <Link
                key={p.id}
                href={`/profile/${p.username}`}
                className="card flex items-center gap-3 p-3 hover:border-[var(--accent)]"
              >
                <Avatar name={p.display_name} url={p.avatar_url} />
                <div>
                  <p className="font-semibold">{p.display_name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    @{p.username}
                    {cls ? ` · ${classSectionLabel(cls, sec)}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
          {results.length === 0 && (
            <div className="card p-6 text-center text-[var(--muted)]">
              No students found
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
