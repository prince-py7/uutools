"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Avatar } from "@/components/ui/Badge";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  demoActiveStories,
  demoCreateStory,
  demoFileToDataUrl,
  demoMarkStoryViewed,
} from "@/lib/demo-store";
import { groupStoriesByClassThenAuthor } from "@/lib/story";

export function StoriesRail() {
  const { user } = useAuth();
  const catalog = useDemoCatalog();
  const [viewer, setViewer] = useState<{
    classId: string;
    authorIds: string[];
    authorIndex: number;
    storyIndex: number;
  } | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");

  const active = useMemo(
    () => demoActiveStories(user?.college_id ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog.stories, user?.college_id, catalog]
  );

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

  const rings = useMemo(() => {
    const items: {
      classId: string;
      authorId: string;
      preview: string;
      label: string;
    }[] = [];
    for (const classId of classOrder) {
      const byAuthor = grouped.get(classId)!;
      for (const [authorId, stories] of byAuthor) {
        const author = catalog.profiles.find((p) => p.id === authorId);
        const cls = catalog.classes.find((c) => c.id === classId);
        items.push({
          classId,
          authorId,
          preview: stories[0]?.media_url || "",
          label: author
            ? `${author.display_name.split(" ")[0]}${cls ? ` · ${cls.name}` : ""}`
            : "Story",
        });
      }
    }
    return items;
  }, [classOrder, grouped, catalog.profiles, catalog.classes]);

  function openAuthor(classId: string, authorId: string) {
    const byAuthor = grouped.get(classId);
    if (!byAuthor) return;
    const authorIds = [...byAuthor.keys()];
    const authorIndex = authorIds.indexOf(authorId);
    setViewer({ classId, authorIds, authorIndex: Math.max(0, authorIndex), storyIndex: 0 });
  }

  const currentStories = useMemo(() => {
    if (!viewer) return [];
    const byAuthor = grouped.get(viewer.classId);
    const authorId = viewer.authorIds[viewer.authorIndex];
    return byAuthor?.get(authorId) || [];
  }, [viewer, grouped]);

  const currentStory = currentStories[viewer?.storyIndex ?? 0];

  useEffect(() => {
    if (!viewer || !currentStory || !user) return;
    demoMarkStoryViewed(currentStory.id, user.id);
  }, [viewer, currentStory, user]);

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
      const nextAuthors = [...(grouped.get(nextClass)?.keys() || [])];
      setViewer({
        classId: nextClass,
        authorIds: nextAuthors,
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
    const res = await demoFileToDataUrl(file, "story");
    if ("error" in res) {
      setError(res.error);
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
    setComposeOpen(false);
    setFile(null);
    setCaption("");
    setError("");
  }

  if (!user) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-1 py-2">
        <button
          type="button"
          className="flex w-16 shrink-0 flex-col items-center gap-1"
          onClick={() => setComposeOpen(true)}
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-[var(--line)] bg-[#121212] text-[var(--accent)]">
            <Plus size={20} />
          </span>
          <span className="truncate text-[10px] text-[var(--muted)]">Your story</span>
        </button>
        {rings.map((r) => (
          <button
            key={`${r.classId}-${r.authorId}`}
            type="button"
            className="flex w-16 shrink-0 flex-col items-center gap-1"
            onClick={() => openAuthor(r.classId, r.authorId)}
          >
            <span className="rounded-full border-2 border-[var(--accent)] p-[2px]">
              <Avatar name={r.label} url={null} size={48} />
            </span>
            <span className="w-full truncate text-center text-[10px] text-[var(--muted)]">
              {r.label}
            </span>
          </button>
        ))}
      </div>

      {composeOpen && (
        <div className="modal-backdrop" onClick={() => setComposeOpen(false)}>
          <div
            className="card w-full max-w-md p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Add class story</h3>
              <button type="button" className="icon-btn" onClick={() => setComposeOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-xs text-[var(--muted)]">
              Visible to your college · disappears after 24 hours · image or video
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              className="mb-3 block w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <input
              className="input mb-3"
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            {error && <p className="mb-2 text-xs text-[var(--danger)]">{error}</p>}
            <button type="button" className="btn btn-primary w-full" onClick={publishStory}>
              Share story
            </button>
          </div>
        </div>
      )}

      {viewer && currentStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
          <button
            type="button"
            className="absolute top-4 right-4 icon-btn text-white"
            onClick={() => setViewer(null)}
            aria-label="Close"
          >
            <X size={22} />
          </button>
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
            <div className="absolute inset-x-0 top-0 flex gap-1 p-3">
              {currentStories.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 flex-1 rounded ${
                    i <= (viewer.storyIndex || 0) ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {(() => {
                const author = catalog.profiles.find(
                  (p) => p.id === currentStory.author_id
                );
                const cls = catalog.classes.find((c) => c.id === currentStory.class_id);
                return (
                  <p className="text-sm font-semibold">
                    {cls?.name} · {author?.display_name}
                  </p>
                );
              })()}
              {currentStory.caption && (
                <p className="text-sm text-white/90">{currentStory.caption}</p>
              )}
            </div>
            <button
              type="button"
              className="absolute inset-y-0 left-0 w-1/3"
              aria-label="Previous"
              onClick={() => {
                if (!viewer) return;
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
      )}
    </>
  );
}
