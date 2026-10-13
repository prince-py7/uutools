"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PostCard } from "@/components/feed/PostCard";
import { LoadingInline } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { isVerifiedForFilter } from "@/lib/badges";
import {
  fetchCollegeClasses,
  fetchPopularThreshold,
  fetchSemesters,
  fetchSubjects,
} from "@/lib/directory";
import { fetchCollegeFeed, type FeedItem } from "@/lib/feed";
import { createClient } from "@/lib/supabase/client";
import type {
  ClassRow,
  Post,
  Semester,
  StudyType,
  Subject,
} from "@/lib/types";

const PREFS_KEY = "uu-study-finder-prefs-v1";

type FinderPrefs = {
  classId: string;
  semesterId: string;
  subjectId: string;
  studyType: string;
  academicYear: string;
  studyUnit: string;
  verifiedOnly: boolean;
};

const emptyPrefs = (): FinderPrefs => ({
  classId: "",
  semesterId: "",
  subjectId: "",
  studyType: "",
  academicYear: "",
  studyUnit: "",
  verifiedOnly: false,
});

function loadPrefs(): FinderPrefs {
  if (typeof window === "undefined") return emptyPrefs();
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return emptyPrefs();
    return { ...emptyPrefs(), ...(JSON.parse(raw) as FinderPrefs) };
  } catch {
    return emptyPrefs();
  }
}

function savePrefs(prefs: FinderPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export default function StudyMaterialsPage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();

  const [prefs, setPrefs] = useState<FinderPrefs>(emptyPrefs);
  const [hydrated, setHydrated] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [demoPosts, setDemoPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [threshold, setThreshold] = useState(catalog.popularThreshold);

  useEffect(() => {
    setPrefs(loadPrefs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePrefs(prefs);
  }, [prefs, hydrated]);

  useEffect(() => {
    if (!user?.college_id) return;
    if (demoMode) {
      setClasses(
        catalog.classes.filter((c) => c.college_id === user.college_id)
      );
      setThreshold(catalog.popularThreshold);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [cls, thr] = await Promise.all([
        fetchCollegeClasses(user.college_id!),
        fetchPopularThreshold(),
      ]);
      if (cancelled) return;
      setClasses(cls);
      setThreshold(thr);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.college_id, demoMode, catalog.classes, catalog.popularThreshold]);

  useEffect(() => {
    if (!prefs.classId) {
      setSemesters([]);
      setSubjects([]);
      return;
    }
    if (demoMode) {
      setSemesters(
        (catalog.semesters || []).filter((s) => s.class_id === prefs.classId)
      );
      setSubjects(
        catalog.subjects.filter((s) =>
          prefs.semesterId
            ? s.semester_id === prefs.semesterId
            : s.class_id === prefs.classId
        )
      );
      return;
    }
    let cancelled = false;
    void (async () => {
      const [sems, subs] = await Promise.all([
        fetchSemesters(prefs.classId),
        prefs.semesterId
          ? (async () => {
              const supabase = createClient();
              const { data } = await supabase
                .from("subjects")
                .select("*")
                .eq("semester_id", prefs.semesterId)
                .order("name");
              return (data as Subject[]) || [];
            })()
          : fetchSubjects(prefs.classId),
      ]);
      if (cancelled) return;
      setSemesters(sems);
      setSubjects(subs);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    prefs.classId,
    prefs.semesterId,
    demoMode,
    catalog.semesters,
    catalog.subjects,
  ]);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    const opts: string[] = [];
    for (let i = 0; i < 8; i++) {
      const start = y - i;
      opts.push(`${start}-${String(start + 1).slice(-2)}`);
    }
    return opts;
  }, []);

  const patch = useCallback((partial: Partial<FinderPrefs>) => {
    setPrefs((p) => ({ ...p, ...partial }));
  }, []);

  async function runSearch() {
    if (!user?.college_id) {
      toast.error("Finish onboarding first");
      return;
    }
    setLoading(true);
    setSearched(true);
    savePrefs(prefs);

    if (demoMode) {
      let list = catalog.posts.filter((p) => {
        if (p.kind !== "study") return false;
        if (p.college_id !== user.college_id) return false;
        if (prefs.classId && p.class_id !== prefs.classId) return false;
        if (prefs.semesterId && p.semester_id !== prefs.semesterId) return false;
        if (prefs.subjectId && p.subject_id !== prefs.subjectId) return false;
        if (prefs.studyType && p.study_type !== prefs.studyType) return false;
        if (prefs.academicYear && p.academic_year !== prefs.academicYear)
          return false;
        if (
          prefs.studyUnit.trim() &&
          !(p.study_unit || "")
            .toLowerCase()
            .includes(prefs.studyUnit.trim().toLowerCase())
        )
          return false;
        if (prefs.verifiedOnly && !isVerifiedForFilter(p, threshold))
          return false;
        return true;
      });
      list = [...list].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setDemoPosts(list);
      setItems([]);
      setLoading(false);
      return;
    }

    const res = await fetchCollegeFeed({
      collegeId: user.college_id,
      userId: user.id,
      classOnly: Boolean(prefs.classId),
      classId: prefs.classId || null,
      sectionId: null,
      studyOnly: true,
      studyType: (prefs.studyType as StudyType) || undefined,
      subjectId: prefs.subjectId || undefined,
    });
    if (res.error) toast.error(res.error);
    let next = res.items.filter((i) => i.post.kind === "study");
    if (prefs.semesterId) {
      next = next.filter((i) => i.post.semester_id === prefs.semesterId);
    }
    if (prefs.academicYear) {
      next = next.filter((i) => i.post.academic_year === prefs.academicYear);
    }
    if (prefs.studyUnit.trim()) {
      const q = prefs.studyUnit.trim().toLowerCase();
      next = next.filter((i) =>
        (i.post.study_unit || "").toLowerCase().includes(q)
      );
    }
    if (prefs.verifiedOnly) {
      next = next.filter((i) => isVerifiedForFilter(i.post, threshold));
    }
    setItems(next);
    setDemoPosts([]);
    setLoading(false);
  }

  if (!ready) {
    return (
      <AppShell>
        <LoadingInline label="Loading…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 px-3 py-4 md:px-0">
        <header className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1a1a1a]">
            <BookOpen size={18} />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Study Materials</h1>
            <p className="text-sm text-[var(--muted)]">
              Find notes by class, semester, subject, unit, and year. Your
              filters stay saved on this device.
            </p>
          </div>
        </header>

        <section className="card space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="input"
              value={prefs.classId}
              onChange={(e) =>
                patch({
                  classId: e.target.value,
                  semesterId: "",
                  subjectId: "",
                })
              }
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={prefs.semesterId}
              onChange={(e) =>
                patch({ semesterId: e.target.value, subjectId: "" })
              }
              disabled={!prefs.classId}
            >
              <option value="">All semesters</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={prefs.subjectId}
              onChange={(e) => patch({ subjectId: e.target.value })}
              disabled={!prefs.classId}
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={prefs.studyType}
              onChange={(e) => patch({ studyType: e.target.value })}
            >
              <option value="">All types</option>
              <option value="unit">Unit / Notes</option>
              <option value="assignment">Assignment</option>
              <option value="practical">Practical</option>
              <option value="whiteboard">Whiteboard</option>
              <option value="other">Other</option>
            </select>
            <input
              className="input"
              placeholder="Unit (e.g. Unit 2)"
              value={prefs.studyUnit}
              onChange={(e) => patch({ studyUnit: e.target.value })}
            />
            <select
              className="input"
              value={prefs.academicYear}
              onChange={(e) => patch({ academicYear: e.target.value })}
            >
              <option value="">Any academic year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={prefs.verifiedOnly}
              onChange={(e) => patch({ verifiedOnly: e.target.checked })}
            />
            Verified / popular only
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={() => void runSearch()}
            >
              {loading ? "Searching…" : "Find materials"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                const cleared = emptyPrefs();
                setPrefs(cleared);
                savePrefs(cleared);
                setSearched(false);
                setItems([]);
                setDemoPosts([]);
              }}
            >
              Reset filters
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            Filters auto-save locally so you don’t re-select every time.
          </p>
        </section>

        <div className="space-y-4 pb-6">
          {loading ? <LoadingInline label="Loading study posts…" /> : null}
          {!loading && searched && demoMode && demoPosts.length === 0 ? (
            <div className="card p-6 text-center text-sm text-[var(--muted)]">
              No study materials match these filters.
            </div>
          ) : null}
          {!loading && searched && !demoMode && items.length === 0 ? (
            <div className="card p-6 text-center text-sm text-[var(--muted)]">
              No study materials match these filters.
            </div>
          ) : null}
          {demoMode
            ? demoPosts.map((p) => <PostCard key={p.id} post={p} />)
            : items.map((item) => (
                <PostCard
                  key={item.post.id}
                  post={item.post}
                  author={item.author}
                  initialLiked={item.liked}
                  initialFavoured={item.favoured}
                  initialComments={item.comments}
                  people={item.people}
                  popularThreshold={threshold}
                />
              ))}
        </div>
      </div>
    </AppShell>
  );
}
