const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export function storyExpiresAt(createdAt: Date | string = new Date()): Date {
  const base = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return new Date(base.getTime() + STORY_TTL_MS);
}

export function isStoryActive(
  expiresAt: string | Date,
  now: Date = new Date()
): boolean {
  const exp = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return exp.getTime() > now.getTime();
}

export function filterActiveStories<T extends { expires_at: string }>(
  stories: T[],
  now: Date = new Date()
): T[] {
  return stories.filter((s) => isStoryActive(s.expires_at, now));
}

/** Group active stories by class_id, then by author for the viewer. */
export function groupStoriesByClassThenAuthor<
  T extends { class_id: string; author_id: string; expires_at: string; created_at: string },
>(stories: T[], now: Date = new Date()) {
  const active = filterActiveStories(stories, now).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const byClass = new Map<string, Map<string, T[]>>();
  for (const s of active) {
    if (!byClass.has(s.class_id)) byClass.set(s.class_id, new Map());
    const byAuthor = byClass.get(s.class_id)!;
    if (!byAuthor.has(s.author_id)) byAuthor.set(s.author_id, []);
    byAuthor.get(s.author_id)!.push(s);
  }
  return byClass;
}
