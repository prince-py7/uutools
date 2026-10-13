"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { getDemoState, newId, saveDemoState } from "@/lib/demo-store";
import {
  emptyTemplateGrid,
  fetchTemplateSlots,
  listTimetableTemplates,
  saveTimetableTemplate,
  slotsToTemplateGrid,
  type TemplateGrid,
} from "@/lib/timetable-db";
import { DAYS, SLOTS } from "@/lib/timetable";
import type {
  ClassRow,
  College,
  Section,
  Semester,
  TimetableTemplate,
} from "@/lib/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function TimetableTemplateEditor({
  colleges,
  classes,
  semesters,
  sections,
  defaultCollegeId,
}: {
  colleges: College[];
  classes: ClassRow[];
  semesters: Semester[];
  sections: Section[];
  defaultCollegeId: string;
}) {
  const { user, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();

  const [collegeId, setCollegeId] = useState(defaultCollegeId);
  const [classId, setClassId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [name, setName] = useState("");
  const [grid, setGrid] = useState<TemplateGrid>(emptyTemplateGrid);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [busy, setBusy] = useState(false);

  const classOptions = useMemo(
    () => classes.filter((c) => c.college_id === collegeId),
    [classes, collegeId]
  );
  const semesterOptions = useMemo(
    () => semesters.filter((s) => s.class_id === classId),
    [semesters, classId]
  );
  const sectionOptions = useMemo(
    () =>
      sections.filter(
        (s) =>
          s.class_id === classId &&
          (!semesterId || s.semester_id === semesterId)
      ),
    [sections, classId, semesterId]
  );

  async function reload() {
    if (demoMode) {
      setTemplates(catalog.timetableTemplates || []);
      return;
    }
    const res = await listTimetableTemplates({
      collegeId: collegeId || undefined,
    });
    if (res.error) toast.error(res.error);
    setTemplates(res.templates);
  }

  useEffect(() => {
    if (defaultCollegeId && !collegeId) setCollegeId(defaultCollegeId);
  }, [defaultCollegeId, collegeId]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, collegeId, catalog.timetableTemplates]);

  function setCell(day: number, slot: number, value: string) {
    setGrid((g) => ({ ...g, [`${day}-${slot}`]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setGrid(emptyTemplateGrid());
  }

  async function loadTemplate(t: TimetableTemplate) {
    setEditingId(t.id);
    setCollegeId(t.college_id);
    setClassId(t.class_id);
    setSemesterId(t.semester_id);
    setSectionId(t.section_id);
    setName(t.name);
    if (demoMode) {
      const slots = (catalog.timetableTemplateSlots || []).filter(
        (s) => s.template_id === t.id
      );
      setGrid(slotsToTemplateGrid(slots));
      return;
    }
    const res = await fetchTemplateSlots(t.id);
    if (res.error) toast.error(res.error);
    setGrid(slotsToTemplateGrid(res.slots));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!collegeId || !classId || !semesterId || !sectionId || !name.trim()) {
      toast.error("Fill class, semester, section, and template name");
      return;
    }
    setBusy(true);

    if (demoMode) {
      const state = getDemoState();
      state.timetableTemplates = state.timetableTemplates || [];
      state.timetableTemplateSlots = state.timetableTemplateSlots || [];
      let tid = editingId;
      if (tid) {
        const row = state.timetableTemplates.find((t) => t.id === tid);
        if (row) {
          row.name = name.trim();
          row.class_id = classId;
          row.semester_id = semesterId;
          row.section_id = sectionId;
          row.college_id = collegeId;
          row.updated_at = new Date().toISOString();
        }
        state.timetableTemplateSlots = state.timetableTemplateSlots.filter(
          (s) => s.template_id !== tid
        );
      } else {
        tid = newId();
        state.timetableTemplates.unshift({
          id: tid,
          college_id: collegeId,
          class_id: classId,
          semester_id: semesterId,
          section_id: sectionId,
          name: name.trim(),
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      for (const d of DAYS) {
        for (const s of SLOTS) {
          state.timetableTemplateSlots.push({
            id: newId(),
            template_id: tid!,
            day_of_week: d,
            slot: s,
            subject_text: (grid[`${d}-${s}`] || "").trim(),
          });
        }
      }
      saveDemoState(state);
      setBusy(false);
      toast.success("Template saved");
      resetForm();
      return;
    }

    const res = await saveTimetableTemplate({
      id: editingId,
      collegeId,
      classId,
      semesterId,
      sectionId,
      name: name.trim(),
      createdBy: user.id,
      grid,
    });
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Template saved");
    resetForm();
    await reload();
  }

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Timetable templates</h2>
        <p className="text-xs text-[var(--muted)]">
          Save a class / semester / section grid. Students can load it when
          editing their timetable, then tweak and save.
        </p>
      </div>

      <form className="space-y-3" onSubmit={(e) => void onSave(e)}>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className="input"
            value={collegeId}
            onChange={(e) => {
              setCollegeId(e.target.value);
              setClassId("");
              setSemesterId("");
              setSectionId("");
            }}
            required
          >
            <option value="">College</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSemesterId("");
              setSectionId("");
            }}
            required
            disabled={!collegeId}
          >
            <option value="">Class</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={semesterId}
            onChange={(e) => {
              setSemesterId(e.target.value);
              setSectionId("");
            }}
            required
            disabled={!classId}
          >
            <option value="">Semester</option>
            {semesterOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            required
            disabled={!semesterId}
          >
            <option value="">Section</option>
            {sectionOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            className="input sm:col-span-2"
            placeholder="Template name (e.g. Default Sem 2 Section B)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="p-1">Day</th>
                {SLOTS.map((s) => (
                  <th key={s} className="p-1">
                    S{s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d, i) => (
                <tr key={d}>
                  <td className="p-1 font-medium text-[var(--muted)]">
                    {DAY_LABELS[i]}
                  </td>
                  {SLOTS.map((s) => (
                    <td key={s} className="p-0.5">
                      <input
                        className="input h-8 px-1 text-[11px]"
                        value={grid[`${d}-${s}`] || ""}
                        maxLength={80}
                        placeholder="—"
                        onChange={(e) => setCell(d, s, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy
              ? "Saving…"
              : editingId
                ? "Update template"
                : "Save template"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={resetForm}
            >
              New template
            </button>
          ) : null}
        </div>
      </form>

      <ul className="space-y-1 border-t border-[var(--line)] pt-3 text-sm text-[var(--muted)]">
        {templates.map((t) => {
          const cls = classes.find((c) => c.id === t.class_id);
          const sem = semesters.find((s) => s.id === t.semester_id);
          const sec = sections.find((s) => s.id === t.section_id);
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate">
                • {t.name}{" "}
                <span className="text-[11px]">
                  ({cls?.name}/{sem?.name}/{sec?.name})
                </span>
              </span>
              <button
                type="button"
                className="btn btn-ghost px-2 py-1 text-xs"
                onClick={() => void loadTemplate(t)}
              >
                Edit
              </button>
            </li>
          );
        })}
        {!templates.length ? (
          <li className="text-xs">No templates yet.</li>
        ) : null}
      </ul>
    </section>
  );
}
