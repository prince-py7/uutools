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
  formatDisplayDate,
  loadAttendancePrefs,
  loadShowResults,
  parseFlexibleDate,
  projectAttendance,
  saveAttendancePrefs,
  saveShowResults,
  toStorageDate,
  type AttendancePrefs,
} from "@/lib/attendance";
import { fetchTimetable } from "@/lib/timetable-db";
import type { TimetableSlot } from "@/lib/types";

const LEAVE_OPTIONS = [0, 1, 2, 3, 5, 7] as const;

export default function AttendancePage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [prefs, setPrefs] = useState<AttendancePrefs>(defaultAttendancePrefs());
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [holidayInput, setHolidayInput] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    const p = loadAttendancePrefs(user.id);
    setPrefs(p);
    setStartText(p.semesterStart ? formatDisplayDate(p.semesterStart) : "");
    setEndText(p.semesterEnd ? formatDisplayDate(p.semesterEnd) : "");
    setShowResults(loadShowResults(user.id));
    setAdvanced(
      Boolean(p.semesterStart || p.semesterEnd || p.holidays.length > 0)
    );
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user || !loaded) return;
    saveAttendancePrefs(user.id, prefs);
  }, [user, prefs, loaded]);

  useEffect(() => {
    if (!user || !loaded) return;
    saveShowResults(user.id, showResults);
  }, [user, showResults, loaded]);

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

  function applyDate(
    field: "semesterStart" | "semesterEnd",
    display: string,
    setText: (v: string) => void
  ) {
    setText(display);
    const trimmed = display.trim();
    if (!trimmed) {
      patch({ [field]: "" });
      return;
    }
    const dt = parseFlexibleDate(trimmed);
    if (!dt) return;
    patch({ [field]: toStorageDate(dt) });
  }

  function addHoliday() {
    const trimmed = holidayInput.trim();
    if (!trimmed) return;
    const dt = parseFlexibleDate(trimmed);
    if (!dt) {
      toast.error("Use DD/MM/YYYY");
      return;
    }
    const key = toStorageDate(dt);
    if (prefs.holidays.includes(key)) return;
    patch({ holidays: [...prefs.holidays, key].sort() });
    setHolidayInput("");
  }

  function onCalculate() {
    setFormError("");
    if (startText.trim() && !parseFlexibleDate(startText)) {
      setFormError("Start date must be DD/MM/YYYY");
      return;
    }
    if (endText.trim() && !parseFlexibleDate(endText)) {
      setFormError("End date must be DD/MM/YYYY");
      return;
    }
    if (prefs.lecturesAttended > prefs.lecturesHeld) {
      setFormError("Attended cannot be more than held");
      return;
    }
    setShowResults(true);
  }

  if (!user) return null;

  const heroPct =
    projection.finalPctIfAttendAll != null
      ? projection.finalPctIfAttendAll
      : projection.currentPct;
  const onTrack = heroPct >= ATTENDANCE_TARGET_PCT;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4 px-3 py-6 md:px-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Attendance</h1>
            <p className="text-sm text-[var(--muted)]">
              Enter a few numbers. Get a clear projection.
            </p>
          </div>
          <Link href="/tools/timetable" className="btn btn-ghost text-sm">
            Timetable
          </Link>
        </div>

        {!showResults ? (
          <section className="card space-y-5 p-4 md:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--muted)]">
                  Lectures held so far
                </span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={prefs.lecturesHeld}
                  onChange={(e) =>
                    patch({
                      lecturesHeld: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--muted)]">
                  Lectures you attended
                </span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={prefs.lecturesAttended}
                  onChange={(e) =>
                    patch({
                      lecturesAttended: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    })
                  }
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--muted)]">
                If I take leave for the next…
              </p>
              <div className="flex flex-wrap gap-2">
                {LEAVE_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      prefs.leaveDays === d
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--muted)]"
                    }`}
                    onClick={() => patch({ leaveDays: d })}
                  >
                    {d === 0 ? "None" : `${d}d`}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="text-sm text-[var(--muted)] underline-offset-2 hover:text-[var(--text)] hover:underline"
              onClick={() => setAdvanced((v) => !v)}
            >
              {advanced ? "Hide advanced options" : "Advanced options"}
            </button>

            {advanced ? (
              <div className="space-y-4 border-t border-[var(--line)] pt-4">
                <p className="text-xs text-[var(--muted)]">
                  Optional. Dates use <b>DD/MM/YYYY</b>. Semester start unlocks
                  Saturday class mapping (open Saturdays follow Mon→Fri from your
                  timetable).
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--muted)]">
                      Semester start
                    </span>
                    <input
                      className="input"
                      inputMode="numeric"
                      placeholder="DD/MM/YYYY"
                      value={startText}
                      onChange={(e) =>
                        applyDate("semesterStart", e.target.value, setStartText)
                      }
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--muted)]">
                      Semester end
                    </span>
                    <input
                      className="input"
                      inputMode="numeric"
                      placeholder="DD/MM/YYYY"
                      value={endText}
                      onChange={(e) =>
                        applyDate("semesterEnd", e.target.value, setEndText)
                      }
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-[var(--muted)]">
                    Extra holidays
                  </span>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="DD/MM/YYYY"
                      value={holidayInput}
                      onChange={(e) => setHolidayInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addHoliday();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={addHoliday}
                    >
                      Add
                    </button>
                  </div>
                  {prefs.holidays.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {prefs.holidays.map((iso) => (
                        <button
                          key={iso}
                          type="button"
                          className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                          onClick={() =>
                            patch({
                              holidays: prefs.holidays.filter((h) => h !== iso),
                            })
                          }
                          title="Remove"
                        >
                          {formatDisplayDate(iso)} ×
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                  Built-in: 1st & 3rd Saturday off. Other Saturdays follow
                  Mon→Tue→Wed→Thu→Fri from semester start. <b>Library</b> & 
                  <b>Lunch</b> = no class.
                </p>
              </div>
            ) : null}

            {formError ? (
              <p className="text-sm text-[var(--danger)]">{formError}</p>
            ) : null}

            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={onCalculate}
            >
              Calculate
            </button>

            {slots.length === 0 ? (
              <p className="text-center text-xs text-[var(--muted)]">
                Tip: save your 
                <Link href="/tools/timetable" className="underline">
                  timetable
                </Link> 
                for better projections.
              </p>
            ) : null}
          </section>
        ) : (
          <div className="space-y-4">
            <section className="card space-y-3 p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {projection.hasEndDate
                  ? "If you attend all remaining"
                  : "Current attendance"}
              </p>
              <p className="text-5xl font-bold tabular-nums tracking-tight">
                {heroPct.toFixed(1)}%
              </p>
              <p
                className={`text-sm font-medium ${
                  onTrack ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {onTrack
                  ? `On track for ${ATTENDANCE_TARGET_PCT}%`
                  : `Below ${ATTENDANCE_TARGET_PCT}% target`}
              </p>
              <p className="mx-auto max-w-md text-sm text-[var(--muted)]">
                {projection.message}
              </p>
              <div className="grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-4 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums">
                    {projection.currentPct.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">Now</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">
                    {projection.futureLectures}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">Left</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">
                    {projection.lecturesAttended}/{projection.lecturesHeld}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">Att / Held</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost mt-2 w-full"
                onClick={() => setShowResults(false)}
              >
                Recalculate
              </button>
            </section>

            {projection.leaveImpact ? (
              <section className="card space-y-2 p-4 md:p-5">
                <h2 className="text-base font-semibold">Leave impact</h2>
                <p className="text-sm text-[var(--muted)]">
                  Skip next 
                  <b className="text-[var(--text)]">
                    {projection.leaveImpact.leaveDays}
                  </b> 
                  class day
                  {projection.leaveImpact.leaveDays > 1 ? "s" : ""} (
                  {projection.leaveImpact.lecturesMissed} lecture
                  {projection.leaveImpact.lecturesMissed !== 1 ? "s" : ""}):
                </p>
                <p className="text-xl font-semibold tabular-nums">
                  {projection.currentPct.toFixed(1)}% → 
                  {projection.leaveImpact.pctAfterLeave.toFixed(1)}%
                  <span className="ml-2 text-sm font-normal text-amber-400">
                    (−{projection.leaveImpact.dropPct.toFixed(1)} pts)
                  </span>
                </p>
              </section>
            ) : null}

            <section className="card space-y-3 p-4 md:p-5">
              <div>
                <h2 className="text-base font-semibold">By subject</h2>
                <p className="text-xs text-[var(--muted)]">
                  Share of your timetable · Library & Lunch excluded
                </p>
              </div>
              {projection.subjects.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  No lecture subjects in timetable yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
                        <th className="py-2 pr-2 font-medium">Subject</th>
                        <th className="px-2 py-2 font-medium">/wk</th>
                        <th className="px-2 py-2 font-medium">Est. %</th>
                        <th className="py-2 pl-2 font-medium">If attend all</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projection.subjects.map((s) => (
                        <tr
                          key={s.subject}
                          className="border-b border-[var(--line)]/60"
                        >
                          <td className="py-2.5 pr-2 font-medium">
                            {s.subject}
                          </td>
                          <td className="px-2 tabular-nums text-[var(--muted)]">
                            {s.perWeek}
                          </td>
                          <td className="px-2 tabular-nums">
                            {s.estimatedPct.toFixed(1)}%
                          </td>
                          <td className="pl-2 tabular-nums text-[var(--muted)]">
                            {s.projectedPctIfAttendAll != null
                              ? `${s.projectedPctIfAttendAll.toFixed(1)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
