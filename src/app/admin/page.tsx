"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { getDemoState, newId, saveDemoState } from "@/lib/demo-store";

export default function AdminPage() {
  const { user, ready } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const [threshold, setThreshold] = useState(10);
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

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.is_admin) router.replace("/home");
    else setThreshold(catalog.popularThreshold);
  }, [ready, user, router, catalog.popularThreshold]);

  if (!user?.is_admin) return null;

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  }

  function saveThreshold(e: FormEvent) {
    e.preventDefault();
    const state = getDemoState();
    state.popularThreshold = Number(threshold) || 10;
    saveDemoState(state);
    flash("Threshold saved");
  }

  function addCollege(e: FormEvent) {
    e.preventDefault();
    if (!collegeName.trim() || !collegeSlug.trim()) return;
    const state = getDemoState();
    const slug = collegeSlug.trim().toLowerCase().replace(/\s+/g, "-");
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
  }

  function addClass(e: FormEvent) {
    e.preventDefault();
    if (!className.trim()) return;
    const state = getDemoState();
    const collegeId = targetCollegeId || state.colleges[0]?.id;
    state.classes.push({
      id: newId(),
      college_id: collegeId,
      name: className.trim().toUpperCase(),
    });
    saveDemoState(state);
    setClassName("");
    flash("Class added");
  }

  function addSection(e: FormEvent) {
    e.preventDefault();
    if (!sectionClassId || !sectionName.trim()) return;
    const state = getDemoState();
    state.sections.push({
      id: newId(),
      class_id: sectionClassId,
      name: sectionName.trim().toUpperCase(),
    });
    saveDemoState(state);
    setSectionName("");
    flash("Section added");
  }

  function addSubject(e: FormEvent) {
    e.preventDefault();
    if (!subjectClassId || !subjectName.trim()) return;
    const state = getDemoState();
    state.subjects.push({
      id: newId(),
      class_id: subjectClassId,
      name: subjectName.trim(),
    });
    saveDemoState(state);
    setSubjectName("");
    flash("Subject added");
  }

  function assignRole(e: FormEvent) {
    e.preventDefault();
    if (!roleUserId || !roleClassId) return;
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
  }

  function toggleUserDisabled(userId: string) {
    const state = getDemoState();
    const p = state.profiles.find((x) => x.id === userId);
    if (!p || p.is_admin) return;
    p.is_disabled = !p.is_disabled;
    saveDemoState(state);
    flash(p.is_disabled ? "User disabled" : "User enabled");
  }

  const roleSections = catalog.sections.filter((s) => s.class_id === roleClassId);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-3 py-4 md:px-0">
        <header>
          <h1 className="text-2xl font-bold">
            Developer portal
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Manage colleges, classes, roles, and UNITIANS POPULAR threshold
          </p>
          {message && (
            <p className="mt-2 text-sm text-[var(--popular)]">{message}</p>
          )}
        </header>

        <section className="card space-y-2 border-[var(--line)] p-5">
          <h2 className="font-semibold">Free-tier notice</h2>
          <p className="text-sm text-[var(--muted)]">{catalog.freeTierNotice}</p>
          <p className="text-xs text-[var(--muted)]">
            Non-commercial pilot: Supabase Free + Vercel Hobby. Watch storage, bandwidth, and
            paused-project limits.
          </p>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Colleges</h2>
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={addCollege}>
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
            <button className="btn btn-primary">Add college</button>
          </form>
          <ul className="text-sm text-[var(--muted)]">
            {catalog.colleges.map((c) => (
              <li key={c.id}>
                • {c.name} ({c.slug}){c.is_active ? "" : " · inactive"}
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">UNITIANS POPULAR like threshold</h2>
          <form className="flex gap-2" onSubmit={saveThreshold}>
            <input
              className="input max-w-[140px]"
              type="number"
              min={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
            <button className="btn btn-primary">Save</button>
          </form>
          <p className="text-xs text-[var(--muted)]">
            Peer study posts with ≥ this many likes appear in Verified-only with a green
            UNITIANS POPULAR badge.
          </p>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Add class</h2>
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={addClass}>
            <select
              className="input"
              value={targetCollegeId}
              onChange={(e) => setTargetCollegeId(e.target.value)}
            >
              <option value="">College (default first)</option>
              {catalog.colleges.map((c) => (
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
            <button className="btn btn-primary">Add</button>
          </form>
          <ul className="text-sm text-[var(--muted)]">
            {catalog.classes.map((c) => {
              const col = catalog.colleges.find((x) => x.id === c.college_id);
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
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={addSection}>
            <select
              className="input"
              value={sectionClassId}
              onChange={(e) => setSectionClassId(e.target.value)}
            >
              <option value="">Class</option>
              {catalog.classes.map((c) => (
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
            <button className="btn btn-primary">Add section</button>
          </form>
          <ul className="text-sm text-[var(--muted)]">
            {catalog.sections.map((s) => {
              const cls = catalog.classes.find((c) => c.id === s.class_id);
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
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={addSubject}>
            <select
              className="input"
              value={subjectClassId}
              onChange={(e) => setSubjectClassId(e.target.value)}
            >
              <option value="">Class</option>
              {catalog.classes.map((c) => (
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
            <button className="btn btn-primary">Add subject</button>
          </form>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Assign CR / Professor</h2>
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={assignRole}>
            <select
              className="input"
              value={roleUserId}
              onChange={(e) => setRoleUserId(e.target.value)}
            >
              <option value="">User</option>
              {catalog.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name} (@{p.username})
                </option>
              ))}
            </select>
            <select
              className="input"
              value={roleType}
              onChange={(e) => setRoleType(e.target.value as "cr" | "professor")}
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
              {catalog.classes.map((c) => (
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
            <button className="btn btn-primary sm:col-span-2">Assign role</button>
          </form>
          <ul className="text-sm text-[var(--muted)]">
            {catalog.roles.map((r) => {
              const p = catalog.profiles.find((x) => x.id === r.user_id);
              const c = catalog.classes.find((x) => x.id === r.class_id);
              const s = catalog.sections.find((x) => x.id === r.section_id);
              return (
                <li key={r.id}>
                  • {p?.display_name} — {c?.name}
                  {s ? ` ${s.name}` : ""} — {r.role.toUpperCase()}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card space-y-2 p-5 opacity-70">
          <h2 className="font-semibold">Teacher delegation (planned)</h2>
          <p className="text-sm text-[var(--muted)]">
            Schema includes <code>teacher_delegations</code> for later. Not granted in this
            release — only developer admins manage colleges/classes/roles.
          </p>
          <button type="button" className="btn btn-ghost" disabled>
            Delegate teacher tools — coming later
          </button>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Users</h2>
          <div className="space-y-2">
            {catalog.profiles.map((p) => (
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
                    onClick={() => toggleUserDisabled(p.id)}
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
