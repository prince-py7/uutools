"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Avatar } from "@/components/ui/Badge";
import { UploadTile } from "@/components/ui/UploadTile";
import { useToast } from "@/components/ui/Toast";
import { SendFriendButton } from "@/components/social/FriendRequests";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoActiveStories,
  demoCreateStory,
  demoFileToDataUrl,
  demoMarkStoryViewed,
} from "@/lib/demo-store";
import {
  createStory,
  fetchActiveStories,
  markStoryViewed,
  type StoryWithAuthor,
} from "@/lib/stories";
import { groupStoriesByClassThenAuthor } from "@/lib/story";
import type { ClassRow, Profile, Story } from "@/lib/types";

export function StoriesRail() {
  const { user, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const toast = useToast();

  const [viewer, setViewer] = useState<{
    classId: string;
    authorIds: string[];
    authorIndex: number;
    storyIndex: number;
  } | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveStories, setLiveStories] = useState<StoryWithAuthor[]>([]);
  const [liveClasses, setLiveClasses] = useState<ClassRow[]>([]);
  const [tick, setTick] = useState(0);

  const reloadLive = useCallback(async () => {
    if (!user?.college_id || demoMode) return;
    const res = await fetchActiveStories(user.college_id);
    if (res.error) toast.error(res.error);
    setLiveStories(res.stories);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("classes")
      .select("*")
      .eq("college_id", user.college_id);
    setLiveClasses((data as ClassRow[]) || []);
  }, [user?.college_id, demoMode, toast]);

  useEffect(() => {
    void reloadLive();
  }, [reloadLive, tick]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const active: Story[] = useMemo(() => {
    if (demoMode) {
      void catalog.stories;
      void tick;
      return demoActiveStories(user?.college_id ?? null);
    }
    return liveStories;
  }, [demoMode, user?.college_id, liveStories, catalog.stories, tick]);

  const profilesById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const p of catalog.profiles) map.set(p.id, p);
    for (const s of liveStories) {
      if (s.author) map.set(s.author.id, s.author);
    }
    return map;
  }, [catalog.profiles, liveStories]);

  const classesById = useMemo(() => {
    const map = new Map<string, ClassRow>();
    for (const c of catalog.classes) map.set(c.id, c);
    for (const c of liveClasses) map.set(c.id, c);
    return map;
  }, [catalog.classes, liveClasses]);

  const grouped = useMemo(
    () => groupStoriesByClassThenAuthor(active),
    [active]
  );

  const classOrder = useMemo(() => {
    const ids = [...grouped.keys()];
    if (user?.class_id) {
      ids.sort((a, b) => {
        if (a === user.class_id) return -1;
        if (b === user.class_id) return 1;
        return 0;
      });
    }
    return ids;
  }, [grouped, user?.class_id]);

  const rings = useMemo(
    () =>
      classOrder.map((classId) => {
        const byAuthor = grouped.get(classId)!;
        const first = [...byAuthor.values()][0] || [];
        const cls = classesById.get(classId);
        return {
          classId,
          preview: first[0]?.media_url || "",
          label: cls?.name || "Class",
        };
      }),
    [classOrder, grouped, classesById]
  );

  function openClass(classId: string) {
    const byAuthor = grouped.get(classId);
    if (!byAuthor) return;
    setViewer({
      classId,
      authorIds: [...byAuthor.keys()],
      authorIndex: 0,
      storyIndex: 0,
    });
  }

  const currentStories = useMemo(() => {
    if (!viewer) return [];
    const byAuthor = grouped.get(viewer.classId);
    const authorId = viewer.authorIds[viewer.authorIndex];
    return byAuthor?.get(authorId) || [];
  }, [viewer, grouped]);

  const currentStory = currentStories[viewer?.storyIndex ?? 0];
  const currentAuthor = currentStory
    ? profilesById.get(currentStory.author_id)
    : null;

  useEffect(() => {
    if (!viewer || !currentStory || !user) return;
    if (demoMode) {
      demoMarkStoryViewed(currentStory.id, user.id);
      return;
    }
    void markStoryViewed(currentStory.id, user.id);
  }, [viewer, currentStory, user, demoMode]);

  function advance() {
    if (!viewer) return;
    if (viewer.storyIndex + 1 < currentStories.length) {
      setViewer({ ...viewer, storyIndex: viewer.storyIndex + 1 });
      return;
    }
    if (viewer.authorIndex + 1 < viewer.authorIds.length) {
      setViewer({
        ...viewer,
        authorIndex: viewer.authorIndex + 1,
        storyIndex: 0,
      });
      return;
    }
    const classIdx = classOrder.indexOf(viewer.classId);
    if (classIdx + 1 < classOrder.length) {
      const nextClass = classOrder[classIdx + 1];
      setViewer({
        classId: nextClass,
        authorIds: [...(grouped.get(nextClass)?.keys() || [])],
        authorIndex: 0,
        storyIndex: 0,
      });
      return;
    }
    setViewer(null);
  }

  async function publishStory() {
    if (!user?.college_id || !user.class_id || !file) {
      setError("Pick an image or video");
      return;
    }
    setBusy(true);
    setError("");
    if (demoMode) {
      const res = await demoFileToDataUrl(file, "story");
      if ("error" in res) {
        setError(res.error);
        setBusy(false);
        return;
      }
      demoCreateStory({
        author_id: user.id,
        college_id: user.college_id,
        class_id: user.class_id,
        media_url: res.url,
        media_type: res.mediaType === "video" ? "video" : "image",
        caption,
      });
      setTick((t) => t + 1);
      toast.success("Story shared");
    } else {
      const res = await createStory({
        authorId: user.id,
        collegeId: user.college_id,
        classId: user.class_id,
        file,
        caption,
      });
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
        setBusy(false);
        return;
      }
      toast.success("Story shared");
      setTick((t) => t + 1);
    }
    setComposeOpen(false);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption("");
    setBusy(false);
  }


  if (!user) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-1 py-2">
        <div className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <button
              type="button"
              className="rounded-full border border-dashed border-[var(--line)] p-[2px]"
              onClick={() => setComposeOpen(true)}
              aria-label="Your story"
            >
              <Avatar
                name={user.display_name}
                url={user.avatar_url}
                size={52}
              />
            </button>
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="absolute -right-0.5 -bottom-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-black bg-[var(--accent)] text-black"
              aria-label="Add story"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
          <span className="truncate text-[10px] text-[var(--muted)]">
            Your story
          </span>
        </div>

        {rings.map((r) => (
          <button
            key={r.classId}
            type="button"
            className="flex w-16 shrink-0 flex-col items-center gap-1"
            onClick={() => openClass(r.classId)}
          >
            <span className="rounded-full border-2 border-[var(--accent)] p-[2px]">
              <span className="grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-full bg-[#121212]">
                {r.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="px-1 text-center text-[9px] font-bold uppercase leading-tight text-[var(--text)]">
                    {r.label}
                  </span>
                )}
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] font-semibold text-[var(--text)]">
              {r.label}
            </span>
          </button>
        ))}
      </div>

      {composeOpen ? (
        <div className="modal-backdrop" onClick={() => setComposeOpen(false)}>
          <div
            className="card w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Add class story</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setComposeOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-xs text-[var(--muted)]">
              Visible to your college · disappears after 24 hours · image or
              video
            </p>
            <UploadTile
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              previewUrl={previewUrl}
              label="Add media"
              className="mb-3"
              onPick={(f) => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setFile(f || null);
                setPreviewUrl(f ? URL.createObjectURL(f) : null);
              }}
            />
            <input
              className="input mb-3"
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            {error ? (
              <p className="mb-2 text-xs text-[var(--danger)]">{error}</p>
            ) : null}
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={busy || !file}
              onClick={() => void publishStory()}
            >
              {busy ? "Sharing…" : "Share story"}
            </button>
          </div>
        </div>
      ) : null}

      {viewer && currentStory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
          <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-3 pt-3 pb-8">
            <div className="mb-3 flex gap-1">
              {currentStories.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 rounded ${
                    i <= viewer.storyIndex ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  name={currentAuthor?.display_name || "Student"}
                  url={currentAuthor?.avatar_url}
                  size={36}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {currentAuthor?.display_name || "Student"}
                  </p>
                  <p className="truncate text-[11px] text-white/70">
                    {classesById.get(currentStory.class_id)?.name || "Class"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {currentAuthor && currentAuthor.id !== user.id ? (
                  <SendFriendButton
                    targetUserId={currentAuthor.id}
                    compact
                  />
                ) : null}
                <button
                  type="button"
                  className="icon-btn text-white"
                  onClick={() => setViewer(null)}
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative h-full max-h-[90vh] w-full max-w-md">
            {currentStory.media_type === "video" ? (
              <video
                src={currentStory.media_url}
                className="h-full w-full object-contain"
                controls
                autoPlay
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentStory.media_url}
                alt=""
                className="h-full w-full object-contain"
              />
            )}
            {currentStory.caption ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-sm text-white/90">{currentStory.caption}</p>
              </div>
            ) : null}
            <button
              type="button"
              className="absolute inset-y-0 left-0 w-1/3"
              aria-label="Previous"
              onClick={() => {
                if (viewer.storyIndex > 0) {
                  setViewer({ ...viewer, storyIndex: viewer.storyIndex - 1 });
                }
              }}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 w-1/3"
              aria-label="Next"
              onClick={advance}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
