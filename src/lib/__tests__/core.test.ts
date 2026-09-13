import { describe, expect, it } from "vitest";
import {
  isUsernameTaken,
  normalizeUsername,
  validateUsername,
} from "../username";
import {
  isEligibleVerifiedOnly,
  isUnitiansPopular,
  rankFeedPosts,
} from "../eligibility";
import { buildBadges } from "../badges";
import {
  filterActiveStories,
  isStoryActive,
  storyExpiresAt,
  groupStoriesByClassThenAuthor,
} from "../story";
import {
  validateTimetableGrid,
  validateTimetableSlot,
} from "../timetable";
import {
  canSendVerification,
  hasFullAccess,
  verificationReminder,
} from "../verification";
import { validateUpload } from "../uploads";
import type { Post, Profile } from "../types";

describe("username uniqueness", () => {
  it("normalizes and validates", () => {
    expect(normalizeUsername("  Aarav.Singh ")).toBe("aarav.singh");
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("aarav_01").ok).toBe(true);
  });

  it("detects taken usernames globally", () => {
    expect(isUsernameTaken("aarav", ["Aarav", "neha"])).toBe(true);
    expect(isUsernameTaken("riya", ["aarav", "neha"])).toBe(false);
    expect(
      isUsernameTaken("aarav", [], "user-1", [
        { id: "user-1", username: "aarav" },
        { id: "user-2", username: "neha" },
      ])
    ).toBe(false);
  });
});

describe("eligibility & badges", () => {
  const basePost: Post = {
    id: "p1",
    author_id: "u1",
    college_id: "c1",
    class_id: "cl1",
    section_id: "s1",
    kind: "study",
    study_type: "unit",
    subject_id: null,
    caption: "notes",
    media_url: null,
    media_type: "pdf",
    like_count: 11,
    comment_count: 0,
    share_count: 0,
    is_official_verified: false,
    created_at: new Date().toISOString(),
  };

  it("verified-only passes official OR popular threshold", () => {
    expect(isEligibleVerifiedOnly(basePost, 10)).toBe(true);
    expect(isEligibleVerifiedOnly({ ...basePost, like_count: 2 }, 10)).toBe(false);
    expect(
      isEligibleVerifiedOnly(
        { ...basePost, like_count: 0, is_official_verified: true },
        10
      )
    ).toBe(true);
  });

  it("UNITIANS POPULAR only for non-official popularity path", () => {
    expect(isUnitiansPopular(basePost, 10)).toBe(true);
    expect(
      isUnitiansPopular({ ...basePost, is_official_verified: true }, 10)
    ).toBe(false);
  });

  it("builds scoped CR label and popular badge", () => {
    const profile: Profile = {
      id: "u1",
      username: "riya_cr",
      email: "r@x.com",
      email_verified: true,
      display_name: "Riya",
      bio: "",
      avatar_url: null,
      college_id: "c1",
      class_id: "cl1",
      section_id: "s1",
      enrollment_id: null,
      socials: {},
      is_admin: false,
      is_disabled: false,
      onboarding_complete: true,
    };
    const badges = buildBadges({
      profile,
      roles: [
        {
          id: "r1",
          user_id: "u1",
          class_id: "cl1",
          section_id: "s1",
          role: "cr",
        },
      ],
      classes: [{ id: "cl1", college_id: "c1", name: "BCA" }],
      sections: [{ id: "s1", class_id: "cl1", name: "B" }],
      post: basePost,
      popularThreshold: 10,
    });
    expect(badges.some((b) => b.label === "BCA B - CR")).toBe(true);
    expect(badges.some((b) => b.kind === "unitians_popular")).toBe(true);
  });

  it("ranks classmates first", () => {
    const viewer = {
      id: "v",
      class_id: "cl1",
    } as Profile;
    const ranked = rankFeedPosts(
      [
        { ...basePost, id: "a", class_id: "other", created_at: "2026-01-02T00:00:00Z" },
        { ...basePost, id: "b", class_id: "cl1", created_at: "2026-01-01T00:00:00Z" },
      ],
      viewer
    );
    expect(ranked[0].id).toBe("b");
  });
});

describe("story expiry", () => {
  it("expires after 24 hours", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const exp = storyExpiresAt(created);
    expect(exp.toISOString()).toBe("2026-01-02T00:00:00.000Z");
    expect(isStoryActive(exp, new Date("2026-01-01T12:00:00Z"))).toBe(true);
    expect(isStoryActive(exp, new Date("2026-01-02T00:00:01Z"))).toBe(false);
  });

  it("filters and groups active stories", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const stories = [
      {
        id: "1",
        class_id: "cl1",
        author_id: "a1",
        created_at: "2026-01-01T10:00:00Z",
        expires_at: "2026-01-02T10:00:00Z",
      },
      {
        id: "2",
        class_id: "cl1",
        author_id: "a2",
        created_at: "2026-01-01T11:00:00Z",
        expires_at: "2025-12-31T00:00:00Z",
      },
    ];
    expect(filterActiveStories(stories, now)).toHaveLength(1);
    const grouped = groupStoriesByClassThenAuthor(stories, now);
    expect(grouped.get("cl1")?.get("a1")).toHaveLength(1);
    expect(grouped.get("cl1")?.has("a2")).toBe(false);
  });
});

describe("timetable validation", () => {
  it("accepts Mon–Fri slots 1–7", () => {
    expect(validateTimetableSlot({ day_of_week: 1, slot: 7, subject_text: "DBMS" }).ok).toBe(
      true
    );
    expect(validateTimetableSlot({ day_of_week: 0, slot: 1, subject_text: "x" }).ok).toBe(
      false
    );
    expect(validateTimetableSlot({ day_of_week: 1, slot: 8, subject_text: "x" }).ok).toBe(
      false
    );
  });

  it("rejects duplicate grid cells", () => {
    expect(
      validateTimetableGrid([
        { day_of_week: 1, slot: 1, subject_text: "A" },
        { day_of_week: 1, slot: 1, subject_text: "B" },
      ]).ok
    ).toBe(false);
  });
});

describe("verification state", () => {
  it("never gates access and throttles sends", () => {
    expect(hasFullAccess({ email_verified: false })).toBe(true);
    expect(verificationReminder({ email_verified: false })).toMatch(/full access/i);
    expect(canSendVerification({ email_verified: true }).ok).toBe(false);
    const blocked = canSendVerification({
      email_verified: false,
      last_verification_sent_at: new Date().toISOString(),
    });
    expect(blocked.ok).toBe(false);
  });
});

describe("upload MIME / size", () => {
  it("rejects oversize study files and bad MIME", () => {
    expect(
      validateUpload({ type: "application/pdf", size: 11 * 1024 * 1024 }, "study-file")
        .ok
    ).toBe(false);
    expect(
      validateUpload({ type: "text/plain", size: 100 }, "study-file").ok
    ).toBe(false);
    expect(
      validateUpload({ type: "image/png", size: 1000 }, "avatar").ok
    ).toBe(true);
  });
});
