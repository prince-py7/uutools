import type {
  Badge,
  ClassRole,
  ClassRow,
  Post,
  Profile,
  Section,
} from "./types";
import { DEFAULT_POPULAR_THRESHOLD } from "./config";

export function classSectionLabel(
  classRow: ClassRow | undefined,
  section: Section | undefined
) {
  if (!classRow) return "";
  return section ? `${classRow.name} ${section.name}` : classRow.name;
}

export function buildBadges(opts: {
  profile: Profile;
  roles: ClassRole[];
  classes: ClassRow[];
  sections: Section[];
  post?: Post;
  popularThreshold?: number;
}): Badge[] {
  const badges: Badge[] = [];
  const threshold = opts.popularThreshold ?? DEFAULT_POPULAR_THRESHOLD;

  if (opts.profile.is_admin) {
    badges.push({ kind: "developer", label: "Developer" });
  }

  for (const role of opts.roles.filter((r) => r.user_id === opts.profile.id)) {
    const cls = opts.classes.find((c) => c.id === role.class_id);
    const sec = opts.sections.find((s) => s.id === role.section_id);
    const base = classSectionLabel(cls, sec) || "Class";
    if (role.role === "cr") {
      badges.push({ kind: "cr", label: `${base} - CR` });
    } else {
      badges.push({ kind: "professor", label: `${base} - Professor` });
    }
  }

  if (opts.post?.is_official_verified) {
    badges.push({ kind: "verified", label: "Verified" });
  }

  if (
    opts.post &&
    !opts.post.is_official_verified &&
    opts.post.kind === "study" &&
    opts.post.like_count >= threshold
  ) {
    badges.push({ kind: "unitians_popular", label: "UNITIANS POPULAR" });
  }

  return badges;
}

export function isVerifiedForFilter(
  post: Post,
  threshold: number
): boolean {
  return (
    post.is_official_verified ||
    (post.kind === "study" && post.like_count >= threshold)
  );
}

export function sortFeedPosts(
  posts: Post[],
  viewer: Profile | null
): Post[] {
  return [...posts].sort((a, b) => {
    const aClass = viewer?.class_id && a.class_id === viewer.class_id ? 0 : 1;
    const bClass = viewer?.class_id && b.class_id === viewer.class_id ? 0 : 1;
    if (aClass !== bClass) return aClass - bClass;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
