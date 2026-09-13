import type { TimetableSlot } from "@/lib/types";

export const ATTENDANCE_TARGET_PCT = 75;

export type AttendancePrefs = {
  semesterStart: string; // YYYY-MM-DD
  semesterEnd: string; // YYYY-MM-DD or ""
  lecturesAttended: number;
  lecturesHeld: number;
  /** YYYY-MM-DD college holidays (no class) */
  holidays: string[];
};

export function defaultAttendancePrefs(): AttendancePrefs {
  return {
    semesterStart: "",
    semesterEnd: "",
    lecturesAttended: 0,
    lecturesHeld: 0,
    holidays: [],
  };
}

/** Empty / "Library" / "no class" → not a lecture. */
export function isLectureSubject(subject: string | null | undefined): boolean {
  const t = (subject || "").trim();
  if (!t) return false;
  if (/^library$/i.test(t)) return false;
  if (/^lib\b/i.test(t) && /no\s*class/i.test(t)) return false;
  if (/^no\s*class$/i.test(t)) return false;
  return true;
}

/** 1st or 3rd Saturday of the month. */
export function isFirstOrThirdSaturday(date: Date): boolean {
  if (date.getDay() !== 6) return false;
  const day = date.getDate();
  return day <= 7 || (day >= 15 && day <= 21);
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Lectures on a calendar day from Mon–Fri timetable.
 * day_of_week: 1=Mon … 5=Fri.
 */
export function lecturesOnDate(
  date: Date,
  slots: TimetableSlot[],
  holidaySet: Set<string>
): number {
  const key = toDateKey(date);
  if (holidaySet.has(key)) return 0;
  if (isFirstOrThirdSaturday(date)) return 0;

  const jsDay = date.getDay(); // 0=Sun … 6=Sat
  if (jsDay === 0 || jsDay === 6) return 0;
  const dayOfWeek = jsDay; // Mon=1 … Fri=5

  let n = 0;
  for (const s of slots) {
    if (s.day_of_week === dayOfWeek && isLectureSubject(s.subject_text)) {
      n += 1;
    }
  }
  return n;
}

export function countLecturesBetween(
  fromInclusive: Date,
  toInclusive: Date,
  slots: TimetableSlot[],
  holidays: string[]
): number {
  const holidaySet = new Set(holidays);
  const from = startOfDay(fromInclusive);
  const to = startOfDay(toInclusive);
  if (to < from) return 0;
  let total = 0;
  const cur = new Date(from);
  while (cur <= to) {
    total += lecturesOnDate(cur, slots, holidaySet);
    cur.setDate(cur.getDate() + 1);
  }
  return total;
}

export type AttendanceProjection = {
  currentPct: number;
  lecturesAttended: number;
  lecturesHeld: number;
  futureLectures: number;
  projectedTotal: number | null;
  finalPctIfAttendAll: number | null;
  lecturesNeededForTarget: number;
  allAttendanceRequiredTill: string | null;
  expectedTargetDate: string | null;
  targetPct: number;
  hasEndDate: boolean;
  message: string;
};

export function projectAttendance(opts: {
  slots: TimetableSlot[];
  prefs: AttendancePrefs;
  today?: Date;
  targetPct?: number;
}): AttendanceProjection {
  const targetPct = opts.targetPct ?? ATTENDANCE_TARGET_PCT;
  const today = startOfDay(opts.today ?? new Date());
  const attended = Math.max(0, Math.floor(opts.prefs.lecturesAttended) || 0);
  const held = Math.max(0, Math.floor(opts.prefs.lecturesHeld) || 0);
  const safeAttended = Math.min(attended, held);
  const currentPct = held === 0 ? 0 : (safeAttended / held) * 100;

  const start = opts.prefs.semesterStart
    ? parseDateKey(opts.prefs.semesterStart)
    : null;
  const end = opts.prefs.semesterEnd
    ? parseDateKey(opts.prefs.semesterEnd)
    : null;

  const futureFrom = new Date(today);
  futureFrom.setDate(futureFrom.getDate() + 1);
  if (start && start > futureFrom) {
    futureFrom.setTime(start.getTime());
  }

  const hasEndDate = Boolean(end);
  const horizon = end
    ? end
    : (() => {
        const d = new Date(today);
        d.setMonth(d.getMonth() + 6);
        return d;
      })();

  const futureLectures =
    horizon >= futureFrom
      ? countLecturesBetween(
          futureFrom,
          horizon,
          opts.slots,
          opts.prefs.holidays
        )
      : 0;

  const projectedTotal = hasEndDate ? held + futureLectures : null;
  const finalPctIfAttendAll =
    projectedTotal && projectedTotal > 0
      ? ((safeAttended + futureLectures) / projectedTotal) * 100
      : null;

  let lecturesNeededForTarget = 0;
  if (currentPct < targetPct) {
    if (targetPct >= 100) {
      lecturesNeededForTarget = Number.POSITIVE_INFINITY;
    } else if (hasEndDate && projectedTotal) {
      const needTotal = Math.ceil((targetPct / 100) * projectedTotal);
      lecturesNeededForTarget = Math.max(0, needTotal - safeAttended);
    } else {
      lecturesNeededForTarget = Math.max(
        0,
        Math.ceil(
          (targetPct * held - 100 * safeAttended) / (100 - targetPct)
        )
      );
    }
  }

  let allAttendanceRequiredTill: string | null = null;
  let expectedTargetDate: string | null = null;
  if (currentPct < targetPct && Number.isFinite(lecturesNeededForTarget)) {
    let a = safeAttended;
    let h = held;
    const holidaySet = new Set(opts.prefs.holidays);
    const cur = new Date(futureFrom);
    const limit = new Date(horizon);
    while (cur <= limit) {
      const n = lecturesOnDate(cur, opts.slots, holidaySet);
      if (n > 0) {
        a += n;
        h += n;
        if (h > 0 && (a / h) * 100 >= targetPct) {
          const key = toDateKey(cur);
          allAttendanceRequiredTill = key;
          expectedTargetDate = key;
          break;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  let message = "";
  if (held === 0 && !opts.prefs.semesterStart) {
    message =
      "Answer the questions below: semester start, lectures held so far, and lectures you attended.";
  } else if (currentPct >= targetPct) {
    message = `You are at ${currentPct.toFixed(1)}% — above the ${targetPct}% target.`;
  } else if (hasEndDate && finalPctIfAttendAll != null) {
    if (finalPctIfAttendAll >= targetPct) {
      message = `If you attend every remaining lecture until ${opts.prefs.semesterEnd}, you finish around ${finalPctIfAttendAll.toFixed(1)}%.`;
    } else {
      message = `Even attending all remaining lectures until ${opts.prefs.semesterEnd} yields ~${finalPctIfAttendAll.toFixed(1)}% — below ${targetPct}%.`;
    }
  } else if (expectedTargetDate) {
    message = `Attend every lecture until ${expectedTargetDate} to reach ${targetPct}%.`;
  } else {
    message = `Need ${Number.isFinite(lecturesNeededForTarget) ? lecturesNeededForTarget : "∞"} more lectures for ${targetPct}%.`;
  }

  return {
    currentPct,
    lecturesAttended: safeAttended,
    lecturesHeld: held,
    futureLectures,
    projectedTotal,
    finalPctIfAttendAll,
    lecturesNeededForTarget,
    allAttendanceRequiredTill,
    expectedTargetDate: hasEndDate
      ? allAttendanceRequiredTill
      : expectedTargetDate,
    targetPct,
    hasEndDate,
    message,
  };
}

const storageKey = (userId: string) => `unitians:attendance:${userId}`;

export function loadAttendancePrefs(userId: string): AttendancePrefs {
  if (typeof window === "undefined") return defaultAttendancePrefs();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaultAttendancePrefs();
    const parsed = JSON.parse(raw) as Partial<AttendancePrefs>;
    return {
      ...defaultAttendancePrefs(),
      ...parsed,
      holidays: Array.isArray(parsed.holidays)
        ? parsed.holidays.filter((d) => typeof d === "string")
        : [],
    };
  } catch {
    return defaultAttendancePrefs();
  }
}

export function saveAttendancePrefs(
  userId: string,
  prefs: AttendancePrefs
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}
