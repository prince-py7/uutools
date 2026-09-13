"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { classSectionLabel } from "@/lib/badges";
import {
  fetchCollegeClasses,
  fetchSections,
  searchProfiles,
} from "@/lib/directory";
import type { ClassRow, Profile, Section } from "@/lib/types";

export default function SearchPage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user?.college_id) return;
    if (demoMode) {
      setClasses(
        catalog.classes.filter((c) => c.college_id === user.college_id)
      );
      return;
    }
    let cancelled = false;
    void fetchCollegeClasses(user.college_id).then((rows) => {
      if (!cancelled) setClasses(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.college_id, demoMode, catalog.classes]);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      return;
    }
    if (demoMode) {
      setSections(catalog.sections.filter((s) => s.class_id === classId));
      return;
    }
    let cancelled = false;
    void fetchSections(classId).then((rows) => {
      if (!cancelled) setSections(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [classId, demoMode, catalog.sections]);

  const demoResults = useMemo(() => {
    if (!demoMode) return [] as Profile[];
    return catalog.profiles.filter((p) => {
      if (p.is_disabled) return false;
      if (user?.college_id && p.college_id !== user.college_id) return false;
      if (classId && p.class_id !== classId) return false;
      if (sectionId && p.section_id !== sectionId) return false;
      if (!q.trim()) return Boolean(classId || sectionId);
      const hay = `${p.username} ${p.display_name}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [
    demoMode,
    catalog.profiles,
    q,
    classId,
    sectionId,
    user?.college_id,
  ]);

  useEffect(() => {
    if (demoMode || !user?.college_id) {
      setResults([]);
      return;
    }
    if (!q.trim() && !classId && !sectionId) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(() => {
      void searchProfiles({
        collegeId: user.college_id!,
        query: q,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
      }).then((res) => {
        if (cancelled) return;
        if (res.error) toast.error(res.error);
        setResults(res.profiles);
        setLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [demoMode, user?.college_id, q, classId, sectionId, toast]);

  const shown = demoMode ? demoResults : results;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-4 md:px-0">
        <h1 className="text-2xl font-bold">Search</h1>
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
          Tip: pick BCA + B to list all registered students in that section
          without typing.
        </p>
        <div className="space-y-2">
          {loading && (
            <p className="text-sm text-[var(--muted)]">Searching…</p>
          )}
          {shown.map((p) => {
            const cls =
              classes.find((c) => c.id === p.class_id) ||
              catalog.classes.find((c) => c.id === p.class_id);
            const sec =
              sections.find((s) => s.id === p.section_id) ||
              catalog.sections.find((s) => s.id === p.section_id);
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
          {!loading && shown.length === 0 && (
            <div className="card p-6 text-center text-[var(--muted)]">
              No students found
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
