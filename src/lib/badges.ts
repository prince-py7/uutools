import type {
  Badge,
  BadgeKind,
  ClassRole,
  ClassRow,
  Post,
  Profile,
  RoleDefinition,
  Section,
} from "./types";
import { DEFAULT_POPULAR_THRESHOLD } from "./config";
import {
  isEligibleVerifiedOnly,
  isUnitiansPopular,
  rankFeedPosts,
} from "./eligibility";

export function classSectionLabel(
  classRow: ClassRow | undefined,
  section: Section | undefined
) {
  if (!classRow) return "";
  return section ? `${classRow.name} ${section.name}` : classRow.name;
}

const BUILTIN_ROLE_LABELS: Record<string, string> = {
  cr: "CR",
  professor: "Professor",
  moderator: "Moderator",
  coordinator: "Coordinator",
  assistant: "Assistant",
};

export function roleBadgeLabel(
  role: string,
  roleDefinitions?: RoleDefinition[]
): string {
  const custom = roleDefinitions?.find((d) => d.role_key === role);
  if (custom?.label) return custom.label;
  if (BUILTIN_ROLE_LABELS[role]) return BUILTIN_ROLE_LABELS[role];
  return role
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function roleBadgeKind(role: string): BadgeKind {
  if (
    role === "cr" ||
    role === "professor" ||
    role === "moderator" ||
    role === "coordinator" ||
    role === "assistant"
  ) {
    return role;
  }
  return "moderator";
}

export function buildBadges(opts: {
  profile: Profile;
  roles: ClassRole[];
  classes: ClassRow[];
  sections: Section[];
  post?: Post;
  popularThreshold?: number;
  roleDefinitions?: RoleDefinition[];
}): Badge[] {
  const badges: Badge[] = [];
  const threshold = opts.popularThreshold ?? DEFAULT_POPULAR_THRESHOLD;

  if (opts.profile.is_admin) {
    badges.push({ kind: "admin", label: "Admin" });
  }

  for (const role of opts.roles.filter((r) => r.user_id === opts.profile.id)) {
    const cls = opts.classes.find((c) => c.id === role.class_id);
    const sec = opts.sections.find((s) => s.id === role.section_id);
    const base = classSectionLabel(cls, sec) || "Class";
    badges.push({
      kind: roleBadgeKind(role.role),
      label: `${base} - ${roleBadgeLabel(role.role, opts.roleDefinitions)}`,
    });
  }

  if (opts.post?.is_official_verified) {
    badges.push({ kind: "verified", label: "Verified" });
  }

  if (opts.post && isUnitiansPopular(opts.post, threshold)) {
    badges.push({ kind: "unitians_popular", label: "UNITIANS POPULAR" });
  }

  return badges;
}

export function isVerifiedForFilter(post: Post, threshold: number): boolean {
  return isEligibleVerifiedOnly(post, threshold);
}

export function sortFeedPosts(posts: Post[], viewer: Profile | null): Post[] {
  return rankFeedPosts(posts, viewer);
}
