"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { demoSaveTimetableSlot } from "@/lib/demo-store";
import { fetchTimetable, saveTimetableSlot } from "@/lib/timetable-db";
import { DAYS as DAY_NS, SLOTS as SLOT_NS } from "@/lib/timetable";
import type { TimetableSlot } from "@/lib/types";

const DAYS = [
  { n: 1, label: "Monday" },
  { n: 2, label: "Tuesday" },
  { n: 3, label: "Wednesday" },
  { n: 4, label: "Thursday" },
  { n: 5, label: "Friday" },
];

const SLOTS = [...SLOT_NS];

export default function TimetablePage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const [day, setDay] = useState(1);
  const [error, setError] = useState("");
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(!demoMode);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      setSlots(catalog.timetables.filter((t) => t.user_id === user.id));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchTimetable(user.id).then((res) => {
      if (cancelled) return;
      if (res.error) toast.error(res.error);
      setSlots(res.slots);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, demoMode, catalog.timetables, toast]);

  const grid = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of slots) {
      map[`${row.day_of_week}-${row.slot}`] = row.subject_text;
    }
    return map;
  }, [slots]);

  async function setCell(
    dayOfWeek: number,
    slot: number,
    subject_text: string
  ) {
    if (!user) return;
    if (!DAY_NS.includes(dayOfWeek as (typeof DAY_NS)[number])) return;

    if (demoMode) {
      const res = demoSaveTimetableSlot(
        user.id,
        dayOfWeek,
        slot,
        subject_text
      );
      if (res.error) setError(res.error);
      else {
        setError("");
        setSlots(catalog.timetables.filter((t) => t.user_id === user.id));
      }
      return;
    }

    setSlots((prev) => {
      const next = prev.filter(
        (r) => !(r.day_of_week === dayOfWeek && r.slot === slot)
      );
      next.push({
        id: `${user.id}-${dayOfWeek}-${slot}`,
        user_id: user.id,
        day_of_week: dayOfWeek,
        slot,
        subject_text,
      });
      return next;
    });

    const res = await saveTimetableSlot(
      user.id,
      dayOfWeek,
      slot,
      subject_text
    );
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else setError("");
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4 px-3 py-6 md:px-0">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-sm text-[var(--muted)]">
          Monday–Friday · 7 slots — set your own subjects
        </p>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {loading && (
          <p className="text-sm text-[var(--muted)]">Loading timetable…</p>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {DAYS.map((d) => (
            <button
              key={d.n}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${
                day === d.n
                  ? "bg-[var(--accent)] text-white"
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
                onChange={(e) => void setCell(day, slot, e.target.value)}
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
                  <td className="p-3 font-semibold text-[var(--muted)]">
                    {slot}
                  </td>
                  {DAYS.map((d) => (
                    <td key={d.n} className="p-2">
                      <input
                        className="input h-9"
                        value={grid[`${d.n}-${slot}`] || ""}
                        onChange={(e) =>
                          void setCell(d.n, slot, e.target.value)
                        }
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
