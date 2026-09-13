import { createClient } from "@/lib/supabase/client";
import { uploadToSupabase } from "@/lib/supabase/upload";
import { storyExpiresAt } from "@/lib/story";
import type { Profile, Story } from "@/lib/types";

export type StoryWithAuthor = Story & { author?: Profile };

export async function fetchActiveStories(
  collegeId: string
): Promise<{ stories: StoryWithAuthor[]; error?: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("college_id", collegeId)
    .gt("expires_at", now)
    .order("created_at", { ascending: true });
  if (error) return { stories: [], error: error.message };
  const stories = (data as Story[]) || [];
  if (!stories.length) return { stories: [] };

  const authorIds = [...new Set(stories.map((s) => s.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", authorIds);
  const byId = new Map(
    ((profiles as Profile[]) || []).map((p) => [p.id, p])
  );
  return {
    stories: stories.map((s) => ({ ...s, author: byId.get(s.author_id) })),
  };
}

export async function createStory(opts: {
  authorId: string;
  collegeId: string;
  classId: string;
  file: File;
  caption?: string;
}): Promise<{ story?: Story; error?: string }> {
  const uploaded = await uploadToSupabase(opts.file, "story", opts.authorId);
  if ("error" in uploaded) return { error: uploaded.error };
  if (uploaded.mediaType === "pdf") {
    return { error: "Stories must be image or video" };
  }

  const created = new Date();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: opts.authorId,
      college_id: opts.collegeId,
      class_id: opts.classId,
      media_url: uploaded.url,
      media_type: uploaded.mediaType === "video" ? "video" : "image",
      caption: opts.caption || "",
      created_at: created.toISOString(),
      expires_at: storyExpiresAt(created).toISOString(),
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { story: data as Story };
}

export async function markStoryViewed(
  storyId: string,
  viewerId: string
): Promise<void> {
  const supabase = createClient();
  await supabase.from("story_views").upsert(
    { story_id: storyId, viewer_id: viewerId },
    { onConflict: "story_id,viewer_id", ignoreDuplicates: true }
  );
}
