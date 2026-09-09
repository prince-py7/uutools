"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth-context";

export default function AttendancePage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [total, setTotal] = useState(40);
  const [attended, setAttended] = useState(28);
  const [target, setTarget] = useState(75);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  const result = useMemo(() => {
    const t = Math.max(0, Number(total) || 0);
    const a = Math.max(0, Math.min(Number(attended) || 0, t));
    const pct = t === 0 ? 0 : (a / t) * 100;
    const goal = Math.min(100, Math.max(0, Number(target) || 0));

    // classes needed to reach goal: (a + x) / (t + x) >= goal/100
    let need = 0;
    if (pct < goal) {
      if (goal >= 100) need = Infinity;
      else {
        need = Math.ceil((goal * t - 100 * a) / (100 - goal));
        need = Math.max(0, need);
      }
    }

    // bunkable while staying above goal: (a) / (t + y) >= goal/100
    let bunk = 0;
    if (pct >= goal && goal > 0) {
      bunk = Math.floor((100 * a) / goal - t);
      bunk = Math.max(0, bunk);
    }

    return { pct, need, bunk, a, t, goal };
  }, [total, attended, target]);

  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-4 px-3 py-6 md:px-0">
        <h1 className="text-2xl font-bold">
          Attendance calculator
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Know how many classes you can bunk — or must attend.
        </p>
        <div className="card space-y-4 p-5">
          <Field label="Total classes held" value={total} setValue={setTotal} />
          <Field label="Classes attended" value={attended} setValue={setAttended} />
          <Field label="Target %" value={target} setValue={setTarget} />
        </div>
        <div className="card space-y-2 p-5">
          <p className="text-3xl font-bold text-[var(--accent)]">
            {result.pct.toFixed(1)}%
          </p>
          <p className="text-sm text-[var(--muted)]">
            Current attendance ({result.a}/{result.t})
          </p>
          {result.pct < result.goal ? (
            <p className="text-sm">
              Attend <b>{Number.isFinite(result.need) ? result.need : "∞"}</b> more
              classes to reach {result.goal}%.
            </p>
          ) : (
            <p className="text-sm">
              You can bunk <b>{result.bunk}</b> classes and still stay at {result.goal}%+.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-[var(--muted)]">{label}</label>
      <input
        className="input"
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
}
