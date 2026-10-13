"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/Loading";
import { UploadTile } from "@/components/ui/UploadTile";
import { useToast } from "@/components/ui/Toast";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  canSendClassAnnouncements,
  createClassAnnouncement,
  fetchMyClassRoles,
} from "@/lib/announcements";
import { demoFileToDataUrl } from "@/lib/demo-store";
import { uploadToSupabase } from "@/lib/supabase/upload";

export default function ClassAnnouncementsPage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sectionOnly, setSectionOnly] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setChecking(true);
    void fetchMyClassRoles(user.id).then((roles) => {
      if (cancelled) return;
      setAllowed(canSendClassAnnouncements(user, roles));
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, demoMode, catalog.roles]);

  const classLabel = useMemo(() => {
    if (!user?.class_id) return "your class";
    return (
      catalog.classes.find((c) => c.id === user.class_id)?.name || "your class"
    );
  }, [user, catalog.classes]);

  async function onPickImage(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    try {
      if (demoMode) {
        const res = await demoFileToDataUrl(file, "post-image");
        if ("error" in res) throw new Error(res.error);
        setImageUrl(res.url);
      } else {
        const res = await uploadToSupabase(file, "post-image", user.id);
        if ("error" in res) throw new Error(res.error);
        setImageUrl(res.url);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    const res = await createClassAnnouncement({
      author: user,
      body,
      imageUrl,
      sectionOnly,
    });
    setSending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      res.notified
        ? `Sent to ${res.notified} classmate${res.notified === 1 ? "" : "s"}`
        : "Announcement sent"
    );
    setBody("");
    setImageUrl(null);
    setSectionOnly(false);
  }

  if (!ready || !user || checking) {
    return (
      <AppShell>
        <LoadingState label="Loading…" />
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg space-y-4 px-3 py-8 md:px-0">
          <h1 className="text-2xl font-bold">Class announcements</h1>
          <div className="card space-y-3 p-5">
            <p className="text-sm text-[var(--muted)]">
              Only Class Representatives and Professors can send announcements.
              Ask an admin to assign your role for {classLabel}.
            </p>
            <Link href="/tools" className="btn btn-ghost inline-flex">
              Back to tools
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-4 px-3 py-6 md:px-0">
        <div>
          <h1 className="text-2xl font-bold">Class announcements</h1>
          <p className="text-sm text-[var(--muted)]">
            Send a message or photo to {classLabel}
          </p>
        </div>

        <form
          className="card space-y-4 p-4 md:p-5"
          onSubmit={(e) => void onSubmit(e)}
        >
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--muted)]">Message</span>
            <textarea
              className="input min-h-[120px] py-2"
              placeholder="Exam hall change, holiday notice…"
              value={body}
              maxLength={2000}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs text-[var(--muted)]">Image (optional)</span>
            {imageUrl ? (
              <div className="space-y-2">
                <UploadTile
                  accept="image/*"
                  onPick={(f) => void onPickImage(f)}
                  previewUrl={imageUrl}
                  label="Change photo"
                  disabled={uploading}
                  size={112}
                />
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  onClick={() => setImageUrl(null)}
                >
                  Remove image
                </button>
              </div>
            ) : (
              <UploadTile
                accept="image/*"
                onPick={(f) => void onPickImage(f)}
                label="Add photo"
                disabled={uploading}
                size={112}
              />
            )}
          </div>

          {user.section_id ? (
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={sectionOnly}
                onChange={(e) => setSectionOnly(e.target.checked)}
              />
              Only my section
            </label>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={sending || uploading || (!body.trim() && !imageUrl)}
          >
            {sending ? "Sending…" : "Send to class"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
