"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { getDemoState, newId, saveDemoState } from "@/lib/demo-store";
import {
  fetchCollegeClasses,
  fetchFreeTierNotice,
  fetchPopularThreshold,
  fetchSections,
  fetchSubjects,
  listAllClassRoles,
  listCollegeProfiles,
  listColleges,
  upsertAppSetting,
} from "@/lib/directory";
import { createClient } from "@/lib/supabase/client";
import type {
  ClassRole,
  ClassRow,
  College,
  Profile,
  Section,
  Subject,
} from "@/lib/types";

export default function AdminPage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();

  const [threshold, setThreshold] = useState(10);
  const [notice, setNotice] = useState("");
  const [className, setClassName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [sectionClassId, setSectionClassId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectClassId, setSubjectClassId] = useState("");
  const [roleUserId, setRoleUserId] = useState("");
  const [roleClassId, setRoleClassId] = useState("");
  const [roleSectionId, setRoleSectionId] = useState("");
  const [roleType, setRoleType] = useState<"cr" | "professor">("cr");
  const [collegeName, setCollegeName] = useState("");
  const [collegeSlug, setCollegeSlug] = useState("");
  const [targetCollegeId, setTargetCollegeId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [colleges, setColleges] = useState<College[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [roles, setRoles] = useState<ClassRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const flash = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(""), 2000);
  }, []);

  const reloadLive = useCallback(async () => {
    if (demoMode) return;
    const [cols, thr, note] = await Promise.all([
      listColleges(),
      fetchPopularThreshold(),
      fetchFreeTierNotice(),
    ]);
    setColleges(cols);
    setThreshold(thr);
    setNotice(note);
    const collegeId = targetCollegeId || cols[0]?.id || user?.college_id || "";
    if (!collegeId) return;
    if (!targetCollegeId) setTargetCollegeId(collegeId);
    const [classRows, profileRows, roleRows] = await Promise.all([
      fetchCollegeClasses(collegeId),
      listCollegeProfiles(collegeId),
      listAllClassRoles(),
    ]);
    setClasses(classRows);
    setProfiles(profileRows);
    setRoles(roleRows);
    const sectionLists = await Promise.all(
      classRows.map((c) => fetchSections(c.id))
    );
    setSections(sectionLists.flat());
    const subjectLists = await Promise.all(
      classRows.map((c) => fetchSubjects(c.id))
    );
    setSubjects(subjectLists.flat());
  }, [demoMode, targetCollegeId, user?.college_id]);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.is_admin) router.replace("/home");
    else if (demoMode) {
      setThreshold(catalog.popularThreshold);
      setNotice(catalog.freeTierNotice);
      setColleges(catalog.colleges);
      setClasses(catalog.classes);
      setSections(catalog.sections);
      setSubjects(catalog.subjects);
      setRoles(catalog.roles);
      setProfiles(catalog.profiles);
    } else {
      void reloadLive();
    }
  }, [ready, user, router, demoMode, catalog, reloadLive]);

  if (!user?.is_admin) return null;

  const roleSections = sections.filter((s) => s.class_id === roleClassId);
  const viewColleges = demoMode ? catalog.colleges : colleges;
  const viewClasses = demoMode ? catalog.classes : classes;
  const viewSections = demoMode ? catalog.sections : sections;
  const viewSubjects = demoMode ? catalog.subjects : subjects;
  const viewRoles = demoMode ? catalog.roles : roles;
  const viewProfiles = demoMode ? catalog.profiles : profiles;

  async function saveThreshold(e: FormEvent) {
    e.preventDefault();
    const value = Number(threshold) || 10;
    if (demoMode) {
      const state = getDemoState();
      state.popularThreshold = value;
      saveDemoState(state);
      flash("Threshold saved");
      return;
    }
    setBusy(true);
    const res = await upsertAppSetting("popular_like_threshold", value);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      flash("Threshold saved");
      toast.success("Threshold saved");
    }
  }

  async function saveNotice(e: FormEvent) {
    e.preventDefault();
    const value = notice.trim();
    if (!value) return;
    if (demoMode) {
      const state = getDemoState();
      state.freeTierNotice = value;
      saveDemoState(state);
      flash("Notice saved");
      return;
    }
    setBusy(true);
    const res = await upsertAppSetting("free_tier_notice", value);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      flash("Notice saved");
      toast.success("Notice saved");
      await reloadLive();
    }
  }

  async function removeRole(roleId: string) {
    if (demoMode) {
      const state = getDemoState();
      state.roles = state.roles.filter((r) => r.id !== roleId);
      saveDemoState(state);
      flash("Role removed");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("class_roles").delete().eq("id", roleId);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      flash("Role removed");
      await reloadLive();
    }
  }

  async function addCollege(e: FormEvent) {
    e.preventDefault();
    if (!collegeName.trim() || !collegeSlug.trim()) return;
    const slug = collegeSlug.trim().toLowerCase().replace(/\s+/g, "-");
    if (demoMode) {
      const state = getDemoState();
      if (state.colleges.some((c) => c.slug === slug)) {
        flash("College slug already exists");
        return;
      }
      state.colleges.push({
        id: newId(),
        name: collegeName.trim(),
        slug,
        is_active: true,
      });
      saveDemoState(state);
      setCollegeName("");
      setCollegeSlug("");
      flash("College added");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("colleges").insert({
      name: collegeName.trim(),
      slug,
      is_active: true,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setCollegeName("");
      setCollegeSlug("");
      flash("College added");
      await reloadLive();
    }
  }

  async function addClass(e: FormEvent) {
    e.preventDefault();
    if (!className.trim()) return;
    const collegeId =
      targetCollegeId || viewColleges[0]?.id || user?.college_id || "";
    if (!collegeId) return;
    if (demoMode) {
      const state = getDemoState();
      state.classes.push({
        id: newId(),
        college_id: collegeId,
        name: className.trim().toUpperCase(),
      });
      saveDemoState(state);
      setClassName("");
      flash("Class added");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("classes").insert({
      college_id: collegeId,
      name: className.trim().toUpperCase(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setClassName("");
      flash("Class added");
      await reloadLive();
    }
  }

  async function addSection(e: FormEvent) {
    e.preventDefault();
    if (!sectionClassId || !sectionName.trim()) return;
    if (demoMode) {
      const state = getDemoState();
      state.sections.push({
        id: newId(),
        class_id: sectionClassId,
        name: sectionName.trim().toUpperCase(),
      });
      saveDemoState(state);
      setSectionName("");
      flash("Section added");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("sections").insert({
      class_id: sectionClassId,
      name: sectionName.trim().toUpperCase(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setSectionName("");
      flash("Section added");
      await reloadLive();
    }
  }

  async function addSubject(e: FormEvent) {
    e.preventDefault();
    if (!subjectClassId || !subjectName.trim()) return;
    if (demoMode) {
      const state = getDemoState();
      state.subjects.push({
        id: newId(),
        class_id: subjectClassId,
        name: subjectName.trim(),
      });
      saveDemoState(state);
      setSubjectName("");
      flash("Subject added");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("subjects").insert({
      class_id: subjectClassId,
      name: subjectName.trim(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setSubjectName("");
      flash("Subject added");
      await reloadLive();
    }
  }

  async function assignRole(e: FormEvent) {
    e.preventDefault();
    if (!roleUserId || !roleClassId) return;
    if (demoMode) {
      const state = getDemoState();
      state.roles = state.roles.filter(
        (r) =>
          !(
            r.user_id === roleUserId &&
            r.class_id === roleClassId &&
            r.role === roleType
          )
      );
      state.roles.push({
        id: newId(),
        user_id: roleUserId,
        class_id: roleClassId,
        section_id: roleSectionId || null,
        role: roleType,
      });
      saveDemoState(state);
      flash("Role assigned");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("class_roles")
      .delete()
      .eq("user_id", roleUserId)
      .eq("class_id", roleClassId)
      .eq("role", roleType);
    const { error } = await supabase.from("class_roles").insert({
      user_id: roleUserId,
      class_id: roleClassId,
      section_id: roleSectionId || null,
      role: roleType,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      flash("Role assigned");
      await reloadLive();
    }
  }

  async function toggleUserDisabled(userId: string) {
    if (demoMode) {
      const state = getDemoState();
      const p = state.profiles.find((x) => x.id === userId);
      if (!p || p.is_admin) return;
      p.is_disabled = !p.is_disabled;
      saveDemoState(state);
      flash(p.is_disabled ? "User disabled" : "User enabled");
      return;
    }
    const p = profiles.find((x) => x.id === userId);
    if (!p || p.is_admin) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_disabled: !p.is_disabled })
      .eq("id", userId);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      flash(!p.is_disabled ? "User disabled" : "User enabled");
      await reloadLive();
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-3 py-4 md:px-0">
        <header>
          <h1 className="text-2xl font-bold">Developer portal</h1>
          <p className="text-sm text-[var(--muted)]">
            Manage colleges, classes, roles, and UNITIANS POPULAR threshold
            {demoMode ? " (demo)" : ""}
          </p>
          {message && (
            <p className="mt-2 text-sm text-[var(--popular)]">{message}</p>
          )}
        </header>

        <section className="card space-y-2 border-[var(--line)] p-5">
          <h2 className="font-semibold">Free-tier notice</h2>
          <form className="space-y-2" onSubmit={(e) => void saveNotice(e)}>
            <textarea
              className="input min-h-[72px]"
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy}>
              Save notice
            </button>
          </form>
          <p className="text-xs text-[var(--muted)]">
            Shown on settings / about surfaces. Non-commercial pilot: Supabase
            Free + Vercel Hobby.
          </p>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Colleges</h2>
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => void addCollege(e)}>
            <input
              className="input"
              placeholder="College name"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
            />
            <input
              className="input"
              placeholder="slug"
              value={collegeSlug}
              onChange={(e) => setCollegeSlug(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy}>
              Add college
            </button>
          </form>
          <ul className="text-sm text-[var(--muted)]">
            {viewColleges.map((c) => (
              <li key={c.id}>
                • {c.name} ({c.slug})
                {c.is_active ? "" : " · inactive"}
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">UNITIANS POPULAR like threshold</h2>
          <form className="flex gap-2" onSubmit={(e) => void saveThreshold(e)}>
            <input
              className="input max-w-[140px]"
              type="number"
              min={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
            <button className="btn btn-primary" disabled={busy}>
              Save
            </button>
          </form>
          <p className="text-xs text-[var(--muted)]">
            Peer study posts with ≥ this many likes appear in Verified-only with
            a green UNITIANS POPULAR badge.
          </p>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Add class</h2>
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => void addClass(e)}>
            <select
              className="input"
              value={targetCollegeId}
              onChange={(e) => setTargetCollegeId(e.target.value)}
            >
              <option value="">College (default first)</option>
              {viewColleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="e.g. MCA"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy}>
              Add
            </button>
          </form>
          <ul className="text-sm text-[var(--muted)]">
            {viewClasses.map((c) => {
              const col = viewColleges.find((x) => x.id === c.college_id);
              return (
                <li key={c.id}>
                  • {c.name} · {col?.name}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Add section</h2>
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => void addSection(e)}>
            <select
              className="input"
              value={sectionClassId}
              onChange={(e) => setSectionClassId(e.target.value)}
            >
              <option value="">Class</option>
              {viewClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="e.g. C"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy}>
              Add section
            </button>
          </form>
          <ul className="text-sm text-[var(--muted)]">
            {viewSections.map((s) => {
              const cls = viewClasses.find((c) => c.id === s.class_id);
              return (
                <li key={s.id}>
                  • {cls?.name} {s.name}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Add subject</h2>
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => void addSubject(e)}>
            <select
              className="input"
              value={subjectClassId}
              onChange={(e) => setSubjectClassId(e.target.value)}
            >
              <option value="">Class</option>
              {viewClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Subject name"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy}>
              Add subject
            </button>
          </form>
          <ul className="text-sm text-[var(--muted)]">
            {viewSubjects.map((s) => {
              const cls = viewClasses.find((c) => c.id === s.class_id);
              return (
                <li key={s.id}>
                  • {cls?.name}: {s.name}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Assign CR / Professor</h2>
          <form
            className="grid gap-2 sm:grid-cols-2"
            onSubmit={(e) => void assignRole(e)}
          >
            <select
              className="input"
              value={roleUserId}
              onChange={(e) => setRoleUserId(e.target.value)}
            >
              <option value="">User</option>
              {viewProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} (@{p.username})
                </option>
              ))}
            </select>
            <select
              className="input"
              value={roleType}
              onChange={(e) =>
                setRoleType(e.target.value as "cr" | "professor")
              }
            >
              <option value="cr">CR</option>
              <option value="professor">Professor</option>
            </select>
            <select
              className="input"
              value={roleClassId}
              onChange={(e) => {
                setRoleClassId(e.target.value);
                setRoleSectionId("");
              }}
            >
              <option value="">Class</option>
              {viewClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={roleSectionId}
              onChange={(e) => setRoleSectionId(e.target.value)}
            >
              <option value="">Section (optional)</option>
              {roleSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary sm:col-span-2" disabled={busy}>
              Assign role
            </button>
          </form>
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            {viewRoles.map((r) => {
              const p = viewProfiles.find((x) => x.id === r.user_id);
              const c = viewClasses.find((x) => x.id === r.class_id);
              const s = viewSections.find((x) => x.id === r.section_id);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    • {p?.display_name} — {c?.name}
                    {s ? ` ${s.name}` : ""} — {r.role.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost h-8 text-xs"
                    disabled={busy}
                    onClick={() => void removeRole(r.id)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card space-y-2 p-5 opacity-70">
          <h2 className="font-semibold">Teacher delegation (planned)</h2>
          <p className="text-sm text-[var(--muted)]">
            Schema includes <code>teacher_delegations</code> for later. Not
            granted in this release — only developer admins manage
            colleges/classes/roles.
          </p>
          <button type="button" className="btn btn-ghost" disabled>
            Delegate teacher tools — coming later
          </button>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Users</h2>
          <div className="space-y-2">
            {viewProfiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                <span>
                  {p.display_name} (@{p.username})
                  {p.is_admin ? " · admin" : ""}
                  {p.is_disabled ? " · disabled" : ""}
                </span>
                {!p.is_admin && (
                  <button
                    className="btn btn-ghost h-8 text-xs"
                    disabled={busy}
                    onClick={() => void toggleUserDisabled(p.id)}
                  >
                    {p.is_disabled ? "Enable" : "Disable"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
