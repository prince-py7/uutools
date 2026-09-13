"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  ATTENDANCE_TARGET_PCT,
  defaultAttendancePrefs,
  loadAttendancePrefs,
  projectAttendance,
  saveAttendancePrefs,
  type AttendancePrefs,
} from "@/lib/attendance";
import { fetchTimetable } from "@/lib/timetable-db";
import type { TimetableSlot } from "@/lib/types";

export default function AttendancePage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [prefs, setPrefs] = useState<AttendancePrefs>(defaultAttendancePrefs());
  const [holidayInput, setHolidayInput] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    setPrefs(loadAttendancePrefs(user.id));
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user || !loaded) return;
    saveAttendancePrefs(user.id, prefs);
  }, [user, prefs, loaded]);

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      setSlots(catalog.timetables.filter((t) => t.user_id === user.id));
      return;
    }
    let cancelled = false;
    void fetchTimetable(user.id).then((res) => {
      if (cancelled) return;
      if (res.error) toast.error(res.error);
      setSlots(res.slots);
    });
    return () => {
      cancelled = true;
    };
  }, [user, demoMode, catalog.timetables, toast]);

  const projection = useMemo(
    () => projectAttendance({ slots, prefs }),
    [slots, prefs]
  );

  function patch(partial: Partial<AttendancePrefs>) {
    setPrefs((p) => ({ ...p, ...partial }));
  }

  function addHoliday() {
    const d = holidayInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      toast.error("Use YYYY-MM-DD for holiday date");
      return;
    }
    if (prefs.holidays.includes(d)) return;
    patch({ holidays: [...prefs.holidays, d].sort() });
    setHolidayInput("");
  }

  function removeHoliday(d: string) {
    patch({ holidays: prefs.holidays.filter((x) => x !== d) });
  }

  const timetableFilled = slots.some((s) => s.subject_text.trim());

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-4 px-3 py-6 md:px-0">
        <header>
          <h1 className="text-2xl font-bold">Attendance calculator</h1>
          <p className="text-sm text-[var(--muted)]">
            Past numbers you enter · future lectures from your timetable.
            Library = no class · 1st &amp; 3rd Saturdays = holiday.
          </p>
        </header>

        {!timetableFilled && (
          <p className="rounded-lg border border-[var(--line)] bg-[#121212] px-3 py-2 text-xs text-[var(--muted)]">
            Tip: fill{" "}
            <Link href="/tools/timetable" className="text-[var(--accent)]">
              Timetable
            </Link>{" "}
            first so future lectures can be estimated.
          </p>
        )}

        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold">Important questions</h2>

          <Field label="Semester registration / start date">
            <input
              className="input"
              type="date"
              value={prefs.semesterStart}
              onChange={(e) => patch({ semesterStart: e.target.value })}
            />
            <Hint>
              Future lectures &amp; holiday rules apply from this day using your
              timetable.
            </Hint>
          </Field>

          <Field label="Semester end date (optional)">
            <input
              className="input"
              type="date"
              value={prefs.semesterEnd}
              onChange={(e) => patch({ semesterEnd: e.target.value })}
            />
            <Hint>
              If set, total lectures = past held + remaining till this date. If
              empty, we show when {ATTENDANCE_TARGET_PCT}% is reachable.
            </Hint>
          </Field>

          <Field label="Total lectures passed (held so far)?">
            <input
              className="input"
              type="number"
              min={0}
              value={prefs.lecturesHeld}
              onChange={(e) =>
                patch({ lecturesHeld: Math.max(0, Number(e.target.value) || 0) })
              }
            />
            <Hint>Past only — you enter this. Future is assumed from timetable.</Hint>
          </Field>

          <Field label="How many lectures have you attended?">
            <input
              className="input"
              type="number"
              min={0}
              value={prefs.lecturesAttended}
              onChange={(e) =>
                patch({
                  lecturesAttended: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          </Field>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="text-sm font-semibold">College holidays</h2>
          <p className="text-xs text-[var(--muted)]">
            Treated like no class. Saved on this device. 1st &amp; 3rd Saturdays
            are already holidays.
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="date"
              value={holidayInput}
              onChange={(e) => setHolidayInput(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={addHoliday}>
              Add
            </button>
          </div>
          {prefs.holidays.length > 0 && (
            <ul className="space-y-1">
              {prefs.holidays.map((d) => (
                <li
                  key={d}
                  className="flex items-center justify-between rounded-md border border-[var(--line)] px-3 py-2 text-sm"
                >
                  <span>{d}</span>
                  <button
                    type="button"
                    className="text-xs text-[var(--danger)]"
                    onClick={() => removeHoliday(d)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card space-y-3 p-5">
          <p className="text-3xl font-bold text-[var(--accent)]">
            {projection.currentPct.toFixed(1)}%
          </p>
          <p className="text-sm text-[var(--muted)]">
            Current ({projection.lecturesAttended}/{projection.lecturesHeld}{" "}
            past) · Target {projection.targetPct}%
          </p>
          <p className="text-sm">{projection.message}</p>

          <dl className="grid gap-2 text-sm">
            <Row
              label="Future lectures (from timetable)"
              value={String(projection.futureLectures)}
            />
            {projection.projectedTotal != null && (
              <Row
                label="Projected total till end date"
                value={String(projection.projectedTotal)}
              />
            )}
            {projection.finalPctIfAttendAll != null && (
              <Row
                label={`If you attend all till ${prefs.semesterEnd || "end"}`}
                value={`${projection.finalPctIfAttendAll.toFixed(1)}%`}
              />
            )}
            {projection.currentPct < projection.targetPct && (
              <Row
                label={`Lectures required to reach ${projection.targetPct}%`}
                value={
                  Number.isFinite(projection.lecturesNeededForTarget)
                    ? String(projection.lecturesNeededForTarget)
                    : "∞"
                }
              />
            )}
            {projection.allAttendanceRequiredTill && (
              <Row
                label={`All attendance required till (for ${projection.targetPct}%)`}
                value={projection.allAttendanceRequiredTill}
              />
            )}
            {!projection.hasEndDate && projection.expectedTargetDate && (
              <Row
                label={`Expected date to hit ${projection.targetPct}%`}
                value={projection.expectedTargetDate}
              />
            )}
          </dl>
        </section>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-[var(--muted)]">{children}</p>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-[var(--line)] pt-2">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="shrink-0 font-semibold">{value}</dd>
    </div>
  );
}
