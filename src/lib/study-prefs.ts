/** Local prefs for faster study compose / find (no server round-trip). */

export const COMPOSER_STUDY_PREFS_KEY = "uu-composer-study-prefs-v1";
export const RECENT_SUBJECTS_KEY = "uu-recent-subjects-v1";

export type ComposerStudyPrefs = {
  classId: string;
  semesterId: string;
  subjectId: string;
  studyType: string;
  academicYear: string;
  studyUnit: string;
};

export type RecentSubject = {
  id: string;
  name: string;
  classId?: string;
  semesterId?: string;
};

const emptyComposerPrefs = (): ComposerStudyPrefs => ({
  classId: "",
  semesterId: "",
  subjectId: "",
  studyType: "unit",
  academicYear: "",
  studyUnit: "",
});

export function loadComposerStudyPrefs(): ComposerStudyPrefs {
  if (typeof window === "undefined") return emptyComposerPrefs();
  try {
    const raw = localStorage.getItem(COMPOSER_STUDY_PREFS_KEY);
    if (!raw) return emptyComposerPrefs();
    return { ...emptyComposerPrefs(), ...(JSON.parse(raw) as ComposerStudyPrefs) };
  } catch {
    return emptyComposerPrefs();
  }
}

export function saveComposerStudyPrefs(prefs: ComposerStudyPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPOSER_STUDY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota / private */
  }
}

export function loadRecentSubjects(): RecentSubject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SUBJECTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RecentSubject[];
    return Array.isArray(list) ? list.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function pushRecentSubject(entry: RecentSubject) {
  if (typeof window === "undefined" || !entry.id) return;
  try {
    const prev = loadRecentSubjects().filter((s) => s.id !== entry.id);
    const next = [entry, ...prev].slice(0, 6);
    localStorage.setItem(RECENT_SUBJECTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
