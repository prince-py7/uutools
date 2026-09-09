"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { getDemoState, newId, saveDemoState } from "@/lib/demo-store";

const DAYS = [
  { n: 1, label: "Monday" },
  { n: 2, label: "Tuesday" },
  { n: 3, label: "Wednesday" },
  { n: 4, label: "Thursday" },
  { n: 5, label: "Friday" },
];

const SLOTS = [1, 2, 3, 4, 5, 6, 7];

export default function TimetablePage() {
  const { user, ready } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const [day, setDay] = useState(1);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  const grid = useMemo(() => {
    if (!user) return {};
    const map: Record<string, string> = {};
    for (const row of catalog.timetables.filter((t) => t.user_id === user.id)) {
      map[`${row.day_of_week}-${row.slot}`] = row.subject_text;
    }
    return map;
  }, [catalog.timetables, user]);

  function setCell(dayOfWeek: number, slot: number, subject_text: string) {
    if (!user) return;
    const state = getDemoState();
    const idx = state.timetables.findIndex(
      (t) =>
        t.user_id === user.id &&
        t.day_of_week === dayOfWeek &&
        t.slot === slot
    );
    if (idx >= 0) {
      state.timetables[idx].subject_text = subject_text;
    } else {
      state.timetables.push({
        id: newId(),
        user_id: user.id,
        day_of_week: dayOfWeek,
        slot,
        subject_text,
      });
    }
    saveDemoState(state);
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4 px-3 py-6 md:px-0">
        <h1 className="text-2xl font-bold">
          Timetable
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Monday–Friday · 7 slots — set your own subjects
        </p>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {DAYS.map((d) => (
            <button
              key={d.n}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${
                day === d.n
                  ? "bg-[var(--accent)] text-[#1a1200]"
                  : "border border-[var(--line)] text-[var(--muted)]"
              }`}
              onClick={() => setDay(d.n)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="card divide-y divide-[var(--line)]">
          {SLOTS.map((slot) => (
            <div key={slot} className="flex items-center gap-3 p-3">
              <div className="w-16 shrink-0 text-sm font-semibold text-[var(--muted)]">
                Slot {slot}
              </div>
              <input
                className="input"
                placeholder="Subject name"
                value={grid[`${day}-${slot}`] || ""}
                onChange={(e) => setCell(day, slot, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="card w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                <th className="p-3">Slot</th>
                {DAYS.map((d) => (
                  <th key={d.n} className="p-3">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot} className="border-b border-[var(--line)]">
                  <td className="p-3 font-semibold text-[var(--muted)]">{slot}</td>
                  {DAYS.map((d) => (
                    <td key={d.n} className="p-2">
                      <input
                        className="input h-9"
                        value={grid[`${d.n}-${slot}`] || ""}
                        onChange={(e) => setCell(d.n, slot, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
