"use client";

import type {
  ClassRole,
  ClassRow,
  College,
  Comment,
  Conversation,
  FriendRequest,
  Message,
  Post,
  Profile,
  Section,
  Story,
  Subject,
  TimetableSlot,
} from "./types";
import { DEFAULT_POPULAR_THRESHOLD } from "./config";
import { validateUsername } from "./username";
import { storyExpiresAt, isStoryActive } from "./story";
import { validateTimetableSlot } from "./timetable";
import { canSendVerification } from "./verification";
import { validateUpload, type UploadKind } from "./uploads";

const KEY = "uu-community-demo-v3";

export type DemoState = {
  sessionUserId: string | null;
  colleges: College[];
  classes: ClassRow[];
  sections: Section[];
  subjects: Subject[];
  profiles: Profile[];
  roles: ClassRole[];
  posts: Post[];
  likes: { user_id: string; post_id: string }[];
  comments: Comment[];
  favourites: { user_id: string; post_id: string }[];
  shares: { id: string; user_id: string; post_id: string }[];
  timetables: TimetableSlot[];
  stories: Story[];
  storyViews: { story_id: string; viewer_id: string }[];
  friendRequests: FriendRequest[];
  conversations: Conversation[];
  messages: Message[];
  popularThreshold: number;
  freeTierNotice: string;
  passwords: Record<string, string>;
};

function id() {
  return crypto.randomUUID();
}

function seed(): DemoState {
  const collegeId = "college-united";
  const bcaId = "class-bca";
  const btechId = "class-btech";
  const secA = "sec-bca-a";
  const secB = "sec-bca-b";
  const secCse = "sec-btech-cse";
  const subDbms = "sub-dbms";
  const subOs = "sub-os";
  const subMath = "sub-math";

  const adminId = "user-admin";
  const crId = "user-cr";
  const profId = "user-prof";
  const stu1 = "user-stu1";
  const stu2 = "user-stu2";

  const now = Date.now();
  const storyCreated = new Date(now - 1000 * 60 * 60).toISOString();

  return {
    sessionUserId: null,
    popularThreshold: DEFAULT_POPULAR_THRESHOLD,
    freeTierNotice:
      "Supabase Free + Vercel Hobby: projects pause after inactivity; storage & bandwidth are limited. Non-commercial pilot only.",
    passwords: {
      admin: "admin123",
      riya_cr: "password",
      prof_sharma: "password",
      aarav: "password",
      neha: "password",
    },
    colleges: [
      {
        id: collegeId,
        name: "United University",
        slug: "united-university",
        is_active: true,
      },
    ],
    classes: [
      { id: bcaId, college_id: collegeId, name: "BCA" },
      { id: btechId, college_id: collegeId, name: "BTech" },
    ],
    sections: [
      { id: secA, class_id: bcaId, name: "A" },
      { id: secB, class_id: bcaId, name: "B" },
      { id: secCse, class_id: btechId, name: "CSE" },
    ],
    subjects: [
      { id: subDbms, class_id: bcaId, name: "DBMS" },
      { id: subOs, class_id: bcaId, name: "Operating Systems" },
      { id: subMath, class_id: bcaId, name: "Mathematics" },
    ],
    profiles: [
      {
        id: adminId,
        username: "admin",
        email: "admin@united.ac.in",
        email_verified: true,
        display_name: "Prince",
        bio: "Building UNITIANS",
        avatar_url: null,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        enrollment_id: null,
        socials: { github: "https://github.com/prince-py7" },
        is_admin: true,
        is_disabled: false,
        onboarding_complete: true,
        last_verification_sent_at: null,
      },
      {
        id: crId,
        username: "riya_cr",
        email: "riya@united.ac.in",
        email_verified: true,
        display_name: "Riya Verma",
        bio: "CR — BCA B",
        avatar_url: null,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        enrollment_id: null,
        socials: {},
        is_admin: false,
        is_disabled: false,
        onboarding_complete: true,
        last_verification_sent_at: null,
      },
      {
        id: profId,
        username: "prof_sharma",
        email: "sharma@united.ac.in",
        email_verified: true,
        display_name: "Prof. Sharma",
        bio: "Faculty — DBMS",
        avatar_url: null,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        enrollment_id: null,
        socials: {},
        is_admin: false,
        is_disabled: false,
        onboarding_complete: true,
        last_verification_sent_at: null,
      },
      {
        id: stu1,
        username: "aarav",
        email: "aarav@united.ac.in",
        email_verified: false,
        display_name: "Aarav Singh",
        bio: "BCA B | coffee + code",
        avatar_url: null,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        enrollment_id: null,
        socials: { instagram: "https://instagram.com" },
        is_admin: false,
        is_disabled: false,
        onboarding_complete: true,
        last_verification_sent_at: null,
      },
      {
        id: stu2,
        username: "neha",
        email: "neha@united.ac.in",
        email_verified: false,
        display_name: "Neha Gupta",
        bio: "BCA A",
        avatar_url: null,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secA,
        enrollment_id: null,
        socials: {},
        is_admin: false,
        is_disabled: false,
        onboarding_complete: true,
        last_verification_sent_at: null,
      },
    ],
    roles: [
      {
        id: "role-cr",
        user_id: crId,
        class_id: bcaId,
        section_id: secB,
        role: "cr",
      },
      {
        id: "role-prof",
        user_id: profId,
        class_id: bcaId,
        section_id: secB,
        role: "professor",
      },
    ],
    posts: [
      {
        id: "post-1",
        author_id: crId,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        kind: "study",
        study_type: "unit",
        subject_id: subDbms,
        caption: "Unit 2 DBMS notes (official) — ER diagrams + normalization.",
        media_url: null,
        media_type: "pdf",
        like_count: 12,
        comment_count: 2,
        share_count: 0,
        is_official_verified: true,
        created_at: new Date(now - 1000 * 60 * 30).toISOString(),
      },
      {
        id: "post-2",
        author_id: profId,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        kind: "study",
        study_type: "assignment",
        subject_id: subDbms,
        caption: "Assignment 3 due Friday. Submit PDF on portal.",
        media_url: null,
        media_type: "none",
        like_count: 8,
        comment_count: 1,
        share_count: 0,
        is_official_verified: true,
        created_at: new Date(now - 1000 * 60 * 90).toISOString(),
      },
      {
        id: "post-3",
        author_id: stu1,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        kind: "social",
        study_type: null,
        subject_id: null,
        caption: "Fest prep vibes in the cafeteria",
        media_url: null,
        media_type: "image",
        like_count: 5,
        comment_count: 0,
        share_count: 0,
        is_official_verified: false,
        created_at: new Date(now - 1000 * 60 * 50).toISOString(),
      },
      {
        id: "post-4",
        author_id: stu1,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        kind: "study",
        study_type: "unit",
        subject_id: subOs,
        caption: "OS Unit 1 summary I made — paging + scheduling. Hope this helps!",
        media_url: null,
        media_type: "pdf",
        like_count: 11,
        comment_count: 1,
        share_count: 0,
        is_official_verified: false,
        created_at: new Date(now - 1000 * 60 * 200).toISOString(),
      },
      {
        id: "post-5",
        author_id: stu2,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secA,
        kind: "study",
        study_type: "practical",
        subject_id: subMath,
        caption: "Practical lab sheet — numerical methods.",
        media_url: null,
        media_type: "pdf",
        like_count: 3,
        comment_count: 0,
        share_count: 0,
        is_official_verified: false,
        created_at: new Date(now - 1000 * 60 * 300).toISOString(),
      },
      {
        id: "post-6",
        author_id: crId,
        college_id: collegeId,
        class_id: bcaId,
        section_id: secB,
        kind: "social",
        study_type: null,
        subject_id: null,
        caption: "Reminder: mid-sem seating out tomorrow morning.",
        media_url: null,
        media_type: "none",
        like_count: 15,
        comment_count: 3,
        share_count: 1,
        is_official_verified: false,
        created_at: new Date(now - 1000 * 60 * 20).toISOString(),
      },
    ],
    likes: [
      { user_id: stu1, post_id: "post-1" },
      { user_id: stu2, post_id: "post-1" },
    ],
    comments: [
      {
        id: "c1",
        post_id: "post-1",
        author_id: stu1,
        body: "Thanks CR",
        created_at: new Date(now - 1000 * 60 * 10).toISOString(),
      },
      {
        id: "c2",
        post_id: "post-1",
        author_id: stu2,
        body: "Can you add Unit 3 too?",
        created_at: new Date(now - 1000 * 60 * 5).toISOString(),
      },
    ],
    favourites: [],
    shares: [],
    timetables: [],
    stories: [
      {
        id: "story-1",
        author_id: crId,
        college_id: collegeId,
        class_id: bcaId,
        media_url: "data:image/svg+xml," + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700"><rect fill="#1a1a1a" width="100%" height="100%"/><text x="50%" y="50%" fill="#f5f5f5" font-size="28" text-anchor="middle" font-family="sans-serif">BCA B — CR</text></svg>`
        ),
        media_type: "image",
        caption: "Lab tomorrow at 10",
        created_at: storyCreated,
        expires_at: storyExpiresAt(storyCreated).toISOString(),
      },
      {
        id: "story-2",
        author_id: stu1,
        college_id: collegeId,
        class_id: bcaId,
        media_url: "data:image/svg+xml," + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700"><rect fill="#121212" width="100%" height="100%"/><text x="50%" y="50%" fill="#0095f6" font-size="24" text-anchor="middle" font-family="sans-serif">Campus day</text></svg>`
        ),
        media_type: "image",
        caption: "",
        created_at: new Date(now - 1000 * 60 * 30).toISOString(),
        expires_at: storyExpiresAt(new Date(now - 1000 * 60 * 30)).toISOString(),
      },
    ],
    storyViews: [],
    friendRequests: [
      {
        id: "fr-1",
        from_user_id: stu2,
        to_user_id: stu1,
        status: "pending",
        created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        updated_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      },
    ],
    conversations: [],
    messages: [],
  };
}

function migrate(raw: DemoState): DemoState {
  const base = seed();
  return {
    ...base,
    ...raw,
    posts: (raw.posts || []).map((p) => ({
      ...p,
      share_count: p.share_count ?? 0,
    })),
    shares: raw.shares || [],
    stories: raw.stories || base.stories,
    storyViews: raw.storyViews || [],
    friendRequests: raw.friendRequests || [],
    conversations: raw.conversations || [],
    messages: raw.messages || [],
    freeTierNotice: raw.freeTierNotice || base.freeTierNotice,
  };
}

function read(): DemoState {
  if (typeof window === "undefined") return seed();
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const s = seed();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  try {
    return migrate(JSON.parse(raw) as DemoState);
  } catch {
    const s = seed();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
}

function write(state: DemoState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("uu-demo-updated"));
}

export function getDemoState() {
  return read();
}

export function resetDemoState() {
  const s = seed();
  write(s);
  return s;
}

export function saveDemoState(state: DemoState) {
  write(state);
}

export function demoLogin(identifier: string, password: string) {
  const state = read();
  const key = identifier.trim().toLowerCase();
  const profile = state.profiles.find(
    (p) => p.username.toLowerCase() === key || p.email.toLowerCase() === key
  );
  if (!profile) return { error: "User not found" };
  if (state.passwords[profile.username] !== password) {
    return { error: "Wrong password" };
  }
  if (profile.is_disabled) return { error: "Account disabled" };
  state.sessionUserId = profile.id;
  write(state);
  return { profile };
}

export function demoSignup(opts: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}) {
  const state = read();
  const parsed = validateUsername(opts.username);
  if (!parsed.ok) return { error: parsed.error };
  const username = parsed.username;
  const email = opts.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email" };
  }
  if (opts.password.length < 6) return { error: "Password must be at least 6 characters" };
  if (state.profiles.some((p) => p.username.toLowerCase() === username)) {
    return { error: "Username taken" };
  }
  if (state.profiles.some((p) => p.email.toLowerCase() === email)) {
    return { error: "Email already registered" };
  }
  const profile: Profile = {
    id: id(),
    username,
    email,
    email_verified: false,
    display_name: opts.displayName || username,
    bio: "",
    avatar_url: null,
    college_id: null,
    class_id: null,
    section_id: null,
    enrollment_id: null,
    socials: {},
    is_admin: false,
    is_disabled: false,
    onboarding_complete: false,
    last_verification_sent_at: null,
  };
  state.profiles.push(profile);
  state.passwords[profile.username] = opts.password;
  state.sessionUserId = profile.id;
  write(state);
  return { profile };
}

export function demoRequestEmailVerification(userId: string) {
  const state = read();
  const profile = state.profiles.find((p) => p.id === userId);
  if (!profile) return { error: "User not found" };
  const gate = canSendVerification(profile);
  if (!gate.ok) return { error: gate.error };
  profile.last_verification_sent_at = new Date().toISOString();
  // Demo: mark verified immediately after "send"
  profile.email_verified = true;
  write(state);
  return { profile };
}

export function demoLogout() {
  const state = read();
  state.sessionUserId = null;
  write(state);
}

export function demoCurrentUser(): Profile | null {
  const state = read();
  if (!state.sessionUserId) return null;
  return state.profiles.find((p) => p.id === state.sessionUserId) ?? null;
}

export function demoUpdateProfile(userId: string, patch: Partial<Profile>) {
  const state = read();
  const idx = state.profiles.findIndex((p) => p.id === userId);
  if (idx < 0) return null;
  state.profiles[idx] = { ...state.profiles[idx], ...patch };
  write(state);
  return state.profiles[idx];
}

export function demoCreatePost(
  post: Omit<Post, "id" | "created_at" | "like_count" | "comment_count" | "share_count">
) {
  const state = read();
  const full: Post = {
    ...post,
    id: id(),
    like_count: 0,
    comment_count: 0,
    share_count: 0,
    created_at: new Date().toISOString(),
  };
  state.posts.unshift(full);
  write(state);
  return full;
}

export function demoToggleLike(userId: string, postId: string) {
  const state = read();
  const existing = state.likes.find(
    (l) => l.user_id === userId && l.post_id === postId
  );
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  if (existing) {
    state.likes = state.likes.filter(
      (l) => !(l.user_id === userId && l.post_id === postId)
    );
    post.like_count = Math.max(0, post.like_count - 1);
  } else {
    state.likes.push({ user_id: userId, post_id: postId });
    post.like_count += 1;
  }
  write(state);
}

export function demoAddComment(userId: string, postId: string, body: string) {
  const state = read();
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return null;
  const comment: Comment = {
    id: id(),
    post_id: postId,
    author_id: userId,
    body,
    created_at: new Date().toISOString(),
  };
  state.comments.push(comment);
  post.comment_count += 1;
  write(state);
  return comment;
}

export function demoToggleFavourite(userId: string, postId: string) {
  const state = read();
  const exists = state.favourites.find(
    (f) => f.user_id === userId && f.post_id === postId
  );
  if (exists) {
    state.favourites = state.favourites.filter(
      (f) => !(f.user_id === userId && f.post_id === postId)
    );
  } else {
    state.favourites.push({ user_id: userId, post_id: postId });
  }
  write(state);
}

export function demoRecordShare(userId: string, postId: string) {
  const state = read();
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  state.shares.push({ id: id(), user_id: userId, post_id: postId });
  post.share_count += 1;
  write(state);
}

export function demoSaveTimetableSlot(
  userId: string,
  day_of_week: number,
  slot: number,
  subject_text: string
) {
  const v = validateTimetableSlot({ day_of_week, slot, subject_text });
  if (!v.ok) return { error: v.error };
  const state = read();
  const existing = state.timetables.find(
    (t) =>
      t.user_id === userId &&
      t.day_of_week === day_of_week &&
      t.slot === slot
  );
  if (existing) {
    existing.subject_text = subject_text;
  } else {
    state.timetables.push({
      id: id(),
      user_id: userId,
      day_of_week,
      slot,
      subject_text,
    });
  }
  write(state);
  return {};
}

export function demoCreateStory(opts: {
  author_id: string;
  college_id: string;
  class_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
}) {
  const state = read();
  const created = new Date();
  const story: Story = {
    id: id(),
    author_id: opts.author_id,
    college_id: opts.college_id,
    class_id: opts.class_id,
    media_url: opts.media_url,
    media_type: opts.media_type,
    caption: opts.caption || "",
    created_at: created.toISOString(),
    expires_at: storyExpiresAt(created).toISOString(),
  };
  state.stories.unshift(story);
  write(state);
  return story;
}

export function demoActiveStories(collegeId: string | null) {
  const state = read();
  return state.stories.filter(
    (s) =>
      isStoryActive(s.expires_at) &&
      (!collegeId || s.college_id === collegeId)
  );
}

export function demoMarkStoryViewed(storyId: string, viewerId: string) {
  const state = read();
  if (
    !state.storyViews.some(
      (v) => v.story_id === storyId && v.viewer_id === viewerId
    )
  ) {
    state.storyViews.push({ story_id: storyId, viewer_id: viewerId });
    write(state);
  }
}

export function demoSendFriendRequest(fromId: string, toId: string) {
  const state = read();
  if (fromId === toId) return { error: "Cannot friend yourself" };
  const from = state.profiles.find((p) => p.id === fromId);
  const to = state.profiles.find((p) => p.id === toId);
  if (!from || !to) return { error: "User not found" };
  if (!from.college_id || from.college_id !== to.college_id) {
    return { error: "Friends must be in the same college" };
  }
  const existing = state.friendRequests.find(
    (r) =>
      (r.from_user_id === fromId && r.to_user_id === toId) ||
      (r.from_user_id === toId && r.to_user_id === fromId)
  );
  if (existing) {
    if (existing.status === "accepted") return { error: "Already friends" };
    if (existing.status === "pending") return { error: "Request already pending" };
  }
  const req: FriendRequest = {
    id: id(),
    from_user_id: fromId,
    to_user_id: toId,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.friendRequests.push(req);
  write(state);
  return { request: req };
}

export function demoRespondFriendRequest(
  requestId: string,
  userId: string,
  accept: boolean
) {
  const state = read();
  const req = state.friendRequests.find((r) => r.id === requestId);
  if (!req) return { error: "Request not found" };
  if (req.to_user_id !== userId) return { error: "Not your request" };
  if (req.status !== "pending") return { error: "Already handled" };
  req.status = accept ? "accepted" : "rejected";
  req.updated_at = new Date().toISOString();
  if (accept) {
    const [a, b] =
      req.from_user_id < req.to_user_id
        ? [req.from_user_id, req.to_user_id]
        : [req.to_user_id, req.from_user_id];
    if (
      !state.conversations.some(
        (c) => c.user_a_id === a && c.user_b_id === b
      )
    ) {
      state.conversations.push({
        id: id(),
        user_a_id: a,
        user_b_id: b,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  write(state);
  return { request: req };
}

export function demoAreFriends(a: string, b: string) {
  const state = read();
  return state.friendRequests.some(
    (r) =>
      r.status === "accepted" &&
      ((r.from_user_id === a && r.to_user_id === b) ||
        (r.from_user_id === b && r.to_user_id === a))
  );
}

export function demoGetOrCreateConversation(userId: string, otherId: string) {
  const state = read();
  if (!demoAreFriends(userId, otherId)) {
    return { error: "You can only message friends" };
  }
  const [a, b] = userId < otherId ? [userId, otherId] : [otherId, userId];
  let conv = state.conversations.find(
    (c) => c.user_a_id === a && c.user_b_id === b
  );
  if (!conv) {
    conv = {
      id: id(),
      user_a_id: a,
      user_b_id: b,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.conversations.push(conv);
    write(state);
  }
  return { conversation: conv };
}

export function demoSendMessage(
  conversationId: string,
  senderId: string,
  body: string
) {
  const state = read();
  const conv = state.conversations.find((c) => c.id === conversationId);
  if (!conv) return { error: "Conversation not found" };
  if (conv.user_a_id !== senderId && conv.user_b_id !== senderId) {
    return { error: "Not a member" };
  }
  const text = body.trim();
  if (!text) return { error: "Empty message" };
  const msg: Message = {
    id: id(),
    conversation_id: conversationId,
    sender_id: senderId,
    body: text,
    created_at: new Date().toISOString(),
  };
  state.messages.push(msg);
  conv.updated_at = msg.created_at;
  write(state);
  return { message: msg };
}

/** Demo file → data URL (respects MIME/size). */
export async function demoFileToDataUrl(
  file: File,
  kind: UploadKind
): Promise<{ url: string; mediaType: "image" | "pdf" | "video" } | { error: string }> {
  const v = validateUpload(file, kind);
  if (!v.ok) return { error: v.error };
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });
  return { url, mediaType: v.mediaType };
}

export { id as newId };
