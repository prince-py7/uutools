import type { TimetableSlot } from "@/lib/types";

export const ATTENDANCE_TARGET_PCT = 75;

export type AttendancePrefs = {
  /** YYYY-MM-DD, optional */
  semesterStart: string;
  /** YYYY-MM-DD, optional */
  semesterEnd: string;
  lecturesAttended: number;
  lecturesHeld: number;
  /** YYYY-MM-DD college holidays (no class) */
  holidays: string[];
  /** Simulate skipping next N lecture-days */
  leaveDays: number;
};

export function defaultAttendancePrefs(): AttendancePrefs {
  return {
    semesterStart: "",
    semesterEnd: "",
    lecturesAttended: 0,
    lecturesHeld: 0,
    holidays: [],
    leaveDays: 0,
  };
}

/** Empty / Library / Lunch / Break / no class → not counted. */
export function isLectureSubject(subject: string | null | undefined): boolean {
  const t = (subject || "").trim();
  if (!t) return false;
  if (/^library$/i.test(t)) return false;
  if (/^lunch$/i.test(t)) return false;
  if (/^break$/i.test(t)) return false;
  if (/^lib\b/i.test(t) && /no\s*class/i.test(t)) return false;
  if (/^no\s*class$/i.test(t)) return false;
  return true;
}

export function normalizeSubjectKey(subject: string): string {
  return subject.trim().replace(/\s+/g, " ");
}

/** 1st or 3rd Saturday of the month = closed. */
export function isFirstOrThirdSaturday(date: Date): boolean {
  if (date.getDay() !== 6) return false;
  const day = date.getDate();
  return day <= 7 || (day >= 15 && day <= 21);
}

/** 2nd / 4th / 5th Saturday = working Saturday. */
export function isWorkingSaturday(date: Date): boolean {
  if (date.getDay() !== 6) return false;
  return !isFirstOrThirdSaturday(date);
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

/** Parse DD/MM/YYYY or YYYY-MM-DD. */
export function parseFlexibleDate(input: string): Date | null {
  const t = input.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return parseDateKey(t);
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

/** Format → DD/MM/YYYY. */
export function formatDisplayDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt =
    typeof d === "string" ? parseFlexibleDate(d) || parseDateKey(d) : d;
  if (!dt) return "—";
  const day = String(dt.getDate()).padStart(2, "0");
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  return `${day}/${mo}/${dt.getFullYear()}`;
}

export function toStorageDate(d: Date): string {
  return toDateKey(d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Index of this working Saturday since semester start (0-based).
 * Open Saturdays (2nd/4th/5th) map to Mon→Tue→Wed→Thu→Fri in sequence.
 */
export function workingSaturdayIndex(
  date: Date,
  semesterStart: Date | null
): number | null {
  if (!isWorkingSaturday(date)) return null;
  const target = startOfDay(date);
  if (!semesterStart) return 0;
  const from = startOfDay(semesterStart);
  if (target < from) return null;

  let idx = 0;
  const cur = new Date(from);
  while (cur <= target) {
    if (isWorkingSaturday(cur)) {
      if (toDateKey(cur) === toDateKey(target)) return idx;
      idx += 1;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

export function saturdayMapsToDayOfWeek(index: number): number {
  return (index % 5) + 1; // 1=Mon … 5=Fri
}

function timetableDayForDate(
  date: Date,
  holidaySet: Set<string>,
  semesterStart: Date | null
): number | null {
  const key = toDateKey(date);
  if (holidaySet.has(key)) return null;
  if (isFirstOrThirdSaturday(date)) return null;

  const jsDay = date.getDay();
  if (jsDay >= 1 && jsDay <= 5) return jsDay;
  if (jsDay === 6) {
    const idx = workingSaturdayIndex(date, semesterStart);
    if (idx == null) return null;
    return saturdayMapsToDayOfWeek(idx);
  }
  return null;
}

function subjectsForDay(dayOfWeek: number, slots: TimetableSlot[]): string[] {
  const list: string[] = [];
  for (const s of slots) {
    if (s.day_of_week === dayOfWeek && isLectureSubject(s.subject_text)) {
      list.push(normalizeSubjectKey(s.subject_text));
    }
  }
  return list;
}

export function lecturesOnDate(
  date: Date,
  slots: TimetableSlot[],
  holidaySet: Set<string>,
  semesterStart: Date | null = null
): number {
  const day = timetableDayForDate(date, holidaySet, semesterStart);
  if (day == null) return 0;
  return subjectsForDay(day, slots).length;
}

export function subjectLecturesOnDate(
  date: Date,
  slots: TimetableSlot[],
  holidaySet: Set<string>,
  semesterStart: Date | null = null
): Record<string, number> {
  const day = timetableDayForDate(date, holidaySet, semesterStart);
  const out: Record<string, number> = {};
  if (day == null) return out;
  for (const sub of subjectsForDay(day, slots)) {
    out[sub] = (out[sub] || 0) + 1;
  }
  return out;
}

export function countLecturesBetween(
  fromInclusive: Date,
  toInclusive: Date,
  slots: TimetableSlot[],
  holidays: string[],
  semesterStart: Date | null = null
): number {
  const holidaySet = new Set(holidays);
  const from = startOfDay(fromInclusive);
  const to = startOfDay(toInclusive);
  if (to < from) return 0;
  let total = 0;
  const cur = new Date(from);
  while (cur <= to) {
    total += lecturesOnDate(cur, slots, holidaySet, semesterStart);
    cur.setDate(cur.getDate() + 1);
  }
  return total;
}

export function weeklySubjectWeights(
  slots: TimetableSlot[]
): { subject: string; perWeek: number }[] {
  const map = new Map<string, number>();
  for (const s of slots) {
    if (!isLectureSubject(s.subject_text)) continue;
    const key = normalizeSubjectKey(s.subject_text);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([subject, perWeek]) => ({ subject, perWeek }))
    .sort((a, b) => b.perWeek - a.perWeek || a.subject.localeCompare(b.subject));
}

export type SubjectBreakdown = {
  subject: string;
  perWeek: number;
  estimatedHeld: number;
  estimatedAttended: number;
  estimatedPct: number;
  futureLectures: number;
  projectedPctIfAttendAll: number | null;
};

export type LeaveImpact = {
  leaveDays: number;
  lecturesMissed: number;
  pctAfterLeave: number;
  dropPct: number;
};

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
  subjects: SubjectBreakdown[];
  leaveImpact: LeaveImpact | null;
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
    ? parseFlexibleDate(opts.prefs.semesterStart)
    : null;
  const end = opts.prefs.semesterEnd
    ? parseFlexibleDate(opts.prefs.semesterEnd)
    : null;

  const futureFrom = new Date(today);
  futureFrom.setDate(futureFrom.getDate() + 1);
  if (start && start > futureFrom) futureFrom.setTime(start.getTime());

  const hasEndDate = Boolean(end);
  const horizon =
    end ??
    (() => {
      const d = new Date(today);
      d.setMonth(d.getMonth() + 6);
      return d;
    })();

  const holidaySet = new Set(opts.prefs.holidays);
  const futureLectures =
    horizon >= futureFrom
      ? countLecturesBetween(
          futureFrom,
          horizon,
          opts.slots,
          opts.prefs.holidays,
          start
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
    } else if (held === 0) {
      lecturesNeededForTarget = 0;
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
    const cur = new Date(futureFrom);
    const limit = new Date(horizon);
    while (cur <= limit) {
      const n = lecturesOnDate(cur, opts.slots, holidaySet, start);
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

  const weights = weeklySubjectWeights(opts.slots);
  const weekTotal = weights.reduce((s, w) => s + w.perWeek, 0) || 1;
  const futureBySubject: Record<string, number> = {};
  if (horizon >= futureFrom) {
    const cur = new Date(futureFrom);
    const limit = new Date(horizon);
    while (cur <= limit) {
      const daySubs = subjectLecturesOnDate(
        cur,
        opts.slots,
        holidaySet,
        start
      );
      for (const [sub, n] of Object.entries(daySubs)) {
        futureBySubject[sub] = (futureBySubject[sub] || 0) + n;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const subjects: SubjectBreakdown[] = weights.map((w) => {
    const share = w.perWeek / weekTotal;
    const estimatedHeld = Math.round(held * share);
    const estimatedAttended = Math.min(
      estimatedHeld,
      Math.round(safeAttended * share)
    );
    const estimatedPct =
      estimatedHeld === 0 ? 0 : (estimatedAttended / estimatedHeld) * 100;
    const future = futureBySubject[w.subject] || 0;
    const projTotal = estimatedHeld + future;
    const projectedPctIfAttendAll =
      projTotal > 0 ? ((estimatedAttended + future) / projTotal) * 100 : null;
    return {
      subject: w.subject,
      perWeek: w.perWeek,
      estimatedHeld,
      estimatedAttended,
      estimatedPct,
      futureLectures: future,
      projectedPctIfAttendAll,
    };
  });

  const leaveDays = Math.max(0, Math.floor(opts.prefs.leaveDays) || 0);
  let leaveImpact: LeaveImpact | null = null;
  if (leaveDays > 0) {
    let missed = 0;
    let daysCounted = 0;
    const cur = new Date(futureFrom);
    for (let i = 0; i < 370 && daysCounted < leaveDays; i++) {
      const n = lecturesOnDate(cur, opts.slots, holidaySet, start);
      if (n > 0) {
        missed += n;
        daysCounted += 1;
      }
      cur.setDate(cur.getDate() + 1);
    }
    const newHeld = held + missed;
    const pctAfter = newHeld === 0 ? currentPct : (safeAttended / newHeld) * 100;
    leaveImpact = {
      leaveDays,
      lecturesMissed: missed,
      pctAfterLeave: pctAfter,
      dropPct: Math.max(0, currentPct - pctAfter),
    };
  }

  let message = "";
  if (held === 0) {
    message =
      "Enter lectures held and attended to see your %. Timetable fills the rest.";
  } else if (currentPct >= targetPct) {
    message = `You are at ${currentPct.toFixed(1)}% — above the ${targetPct}% target.`;
  } else if (hasEndDate && finalPctIfAttendAll != null) {
    if (finalPctIfAttendAll >= targetPct) {
      message = `Attend every remaining class till ${formatDisplayDate(opts.prefs.semesterEnd)} → finish ~${finalPctIfAttendAll.toFixed(1)}%.`;
    } else {
      message = `Even full attendance till ${formatDisplayDate(opts.prefs.semesterEnd)} → ~${finalPctIfAttendAll.toFixed(1)}% (below ${targetPct}%).`;
    }
  } else if (expectedTargetDate) {
    message = `Attend every lecture until ${formatDisplayDate(expectedTargetDate)} to reach ${targetPct}%.`;
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
    subjects,
    leaveImpact,
  };
}

const storageKey = (userId: string) => `unitians:attendance:session:${userId}`;
const resultKey = (userId: string) =>
  `unitians:attendance:showResults:${userId}`;

export function loadAttendancePrefs(userId: string): AttendancePrefs {
  if (typeof window === "undefined") return defaultAttendancePrefs();
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return defaultAttendancePrefs();
    const parsed = JSON.parse(raw) as Partial<AttendancePrefs>;
    return {
      ...defaultAttendancePrefs(),
      ...parsed,
      holidays: Array.isArray(parsed.holidays)
        ? parsed.holidays.filter((d) => typeof d === "string")
        : [],
      leaveDays: Math.max(0, Number(parsed.leaveDays) || 0),
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
  sessionStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}

export function loadShowResults(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(resultKey(userId)) === "1";
}

export function saveShowResults(userId: string, show: boolean): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(resultKey(userId), show ? "1" : "0");
}
