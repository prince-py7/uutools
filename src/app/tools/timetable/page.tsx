"use client";

import { LoadingInline } from "@/components/ui/Loading";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MoreVertical, Pencil, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { demoSaveTimetableSlot } from "@/lib/demo-store";
import {
  fetchTemplateSlots,
  fetchTimetable,
  listTimetableTemplates,
  saveTimetableSlot,
  slotsToTemplateGrid,
} from "@/lib/timetable-db";
import { DAYS as DAY_NS, SLOTS as SLOT_NS } from "@/lib/timetable";
import type { TimetableSlot, TimetableTemplate } from "@/lib/types";

const DAYS = [
  { n: 1, label: "Mon", full: "Monday" },
  { n: 2, label: "Tue", full: "Tuesday" },
  { n: 3, label: "Wed", full: "Wednesday" },
  { n: 4, label: "Thu", full: "Thursday" },
  { n: 5, label: "Fri", full: "Friday" },
];

const SLOTS = [...SLOT_NS];

function emptyGrid(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const d of DAY_NS) {
    for (const s of SLOT_NS) map[`${d}-${s}`] = "";
  }
  return map;
}

function slotsToGrid(rows: TimetableSlot[]): Record<string, string> {
  const map = emptyGrid();
  for (const row of rows) {
    map[`${row.day_of_week}-${row.slot}`] = row.subject_text;
  }
  return map;
}

export default function TimetablePage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>(emptyGrid());
  const [loading, setLoading] = useState(!demoMode);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    if (demoMode) {
      const mine = catalog.timetables.filter((t) => t.user_id === user.id);
      setSlots(mine);
      if (!editing) setDraft(slotsToGrid(mine));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchTimetable(user.id).then((res) => {
      if (cancelled) return;
      if (res.error) toast.error(res.error);
      setSlots(res.slots);
      if (!editing) setDraft(slotsToGrid(res.slots));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, demoMode, catalog.timetables, toast]);

  useEffect(() => {
    if (!user?.class_id) {
      setTemplates([]);
      return;
    }
    if (demoMode) {
      const list = (catalog.timetableTemplates || []).filter((t) => {
        if (t.class_id !== user.class_id) return false;
        if (user.semester_id && t.semester_id !== user.semester_id) return false;
        if (user.section_id && t.section_id !== user.section_id) return false;
        return true;
      });
      setTemplates(list);
      return;
    }
    let cancelled = false;
    void listTimetableTemplates({
      classId: user.class_id,
      semesterId: user.semester_id,
      sectionId: user.section_id,
    }).then((res) => {
      if (cancelled) return;
      if (res.error) toast.error(res.error);
      setTemplates(res.templates);
    });
    return () => {
      cancelled = true;
    };
  }, [
    user?.class_id,
    user?.semester_id,
    user?.section_id,
    demoMode,
    catalog.timetableTemplates,
    toast,
    user,
  ]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const grid = useMemo(
    () => (editing ? draft : slotsToGrid(slots)),
    [editing, draft, slots]
  );

  function startEdit() {
    setDraft(slotsToGrid(slots));
    setEditing(true);
    setMenuOpen(false);
  }

  function cancelEdit() {
    setDraft(slotsToGrid(slots));
    setEditing(false);
    setError("");
    setTemplateId("");
    setMenuOpen(false);
  }

  function setDraftCell(dayOfWeek: number, slot: number, value: string) {
    setDraft((prev) => ({ ...prev, [`${dayOfWeek}-${slot}`]: value }));
  }

  async function applyTemplate() {
    if (!templateId) {
      toast.error("Pick a template first");
      return;
    }
    if (demoMode) {
      const rows = (catalog.timetableTemplateSlots || []).filter(
        (s) => s.template_id === templateId
      );
      setDraft(slotsToTemplateGrid(rows));
      setEditing(true);
      toast.success("Template loaded — edit then save");
      return;
    }
    const res = await fetchTemplateSlots(templateId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setDraft(slotsToTemplateGrid(res.slots));
    setEditing(true);
    toast.success("Template loaded — edit then save");
  }

  async function saveAll() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      for (const d of DAY_NS) {
        for (const s of SLOT_NS) {
          const key = `${d}-${s}`;
          const subject_text = (draft[key] || "").trim();
          const prev =
            slots.find((r) => r.day_of_week === d && r.slot === s)
              ?.subject_text || "";
          if (prev === subject_text) continue;

          if (demoMode) {
            const res = demoSaveTimetableSlot(user.id, d, s, subject_text);
            if (res.error) throw new Error(res.error);
          } else {
            const res = await saveTimetableSlot(user.id, d, s, subject_text);
            if (res.error) throw new Error(res.error);
          }
        }
      }
      if (demoMode) {
        const mine = catalog.timetables.filter((t) => t.user_id === user.id);
        setSlots(mine);
        setDraft(slotsToGrid(mine));
      } else {
        const res = await fetchTimetable(user.id);
        if (res.error) throw new Error(res.error);
        setSlots(res.slots);
        setDraft(slotsToGrid(res.slots));
      }
      setEditing(false);
      setTemplateId("");
      toast.success("Timetable saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      setMenuOpen(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4 px-3 py-6 md:px-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Timetable</h1>
            <p className="text-sm text-[var(--muted)]">
              Monday–Friday · 7 slots · Library / Lunch = no class
            </p>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Timetable options"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--line)] bg-[#121212] py-1 shadow-xl">
                {!editing ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#1a1a1a]"
                    onClick={startEdit}
                  >
                    <Pencil size={16} /> Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#1a1a1a]"
                      disabled={saving}
                      onClick={() => void saveAll()}
                    >
                      <Check size={16} /> Save
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--muted)] hover:bg-[#1a1a1a]"
                      disabled={saving}
                      onClick={cancelEdit}
                    >
                      <X size={16} /> Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {loading && <LoadingInline label="Loading timetable…" />}

        {templates.length > 0 && (
          <div className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1 space-y-1">
              <span className="text-xs text-[var(--muted)]">
                Class template
              </span>
              <select
                className="input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              disabled={!templateId}
              onClick={() => void applyTemplate()}
            >
              Load into editor
            </button>
          </div>
        )}

        {editing && (
          <p className="rounded-lg border border-[var(--line)] bg-[#121212] px-3 py-2 text-xs text-[var(--muted)]">
            Editing — load a template if you want, tweak cells, then{" "}
            <b>Save</b>. Type <b>Library</b> or <b>Lunch</b> for no class.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="card w-full min-w-[640px] border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[var(--muted)]">
                <th className="sticky left-0 z-10 bg-black p-2 md:p-3">Day</th>
                {SLOTS.map((slot) => (
                  <th key={slot} className="p-2 md:p-3">
                    Slot {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => (
                <tr key={d.n} className="border-b border-[var(--line)]">
                  <td
                    className="sticky left-0 z-10 bg-black p-2 font-semibold text-[var(--muted)] md:p-3"
                    title={d.full}
                  >
                    <span className="md:hidden">{d.label}</span>
                    <span className="hidden md:inline">{d.full}</span>
                  </td>
                  {SLOTS.map((slot) => {
                    const val = grid[`${d.n}-${slot}`] || "";
                    return (
                      <td key={slot} className="p-1.5 md:p-2">
                        {editing ? (
                          <input
                            className="input h-8 px-1.5 text-[11px] md:h-9 md:text-sm"
                            value={val}
                            placeholder="—"
                            maxLength={80}
                            onChange={(e) =>
                              setDraftCell(d.n, slot, e.target.value)
                            }
                          />
                        ) : (
                          <div
                            className={`min-h-8 rounded-md px-1.5 py-1.5 ${
                              val
                                ? "bg-[#141414] text-[var(--text)]"
                                : "text-[var(--muted)]"
                            }`}
                            title={val || "Empty"}
                          >
                            {val || "—"}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={saving}
              onClick={() => void saveAll()}
            >
              {saving ? "Saving…" : "Save timetable"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving}
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
