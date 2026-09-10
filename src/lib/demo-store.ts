"use client";

import type {
  ClassRole,
  ClassRow,
  College,
  Comment,
  Post,
  Profile,
  Section,
  Subject,
  TimetableSlot,
} from "./types";
import { DEFAULT_POPULAR_THRESHOLD } from "./config";

const KEY = "uu-community-demo-v2";

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
  timetables: TimetableSlot[];
  popularThreshold: number;
  passwords: Record<string, string>; // username -> password (demo only)
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

  return {
    sessionUserId: null,
    popularThreshold: DEFAULT_POPULAR_THRESHOLD,
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
        socials: { github: "https://github.com/prince-py7" },
        is_admin: true,
        is_disabled: false,
        onboarding_complete: true,
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
        socials: {},
        is_admin: false,
        is_disabled: false,
        onboarding_complete: true,
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
        socials: {},
        is_admin: false,
        is_disabled: false,
        onboarding_complete: true,
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
        socials: { instagram: "https://instagram.com" },
        is_admin: false,
        is_disabled: false,
        onboarding_complete: true,
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
        socials: {},
        is_admin: false,
        is_disabled: false,
        onboarding_complete: true,
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
        caption: "Fest prep vibes in the cafeteria ✨",
        media_url: null,
        media_type: "image",
        like_count: 5,
        comment_count: 0,
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
        body: "Thanks CR 🔥",
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
    timetables: [],
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
    return JSON.parse(raw) as DemoState;
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
    (p) =>
      p.username.toLowerCase() === key || p.email.toLowerCase() === key
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
  const username = opts.username.trim().toLowerCase();
  const email = opts.email.trim().toLowerCase();
  if (!/^[a-z0-9._]{3,24}$/.test(username)) {
    return { error: "Username must be 3–24 chars (letters, numbers, . _)" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email" };
  }
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
    socials: {},
    is_admin: false,
    is_disabled: false,
    onboarding_complete: false,
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
  // Demo: mark verified immediately (real app sends email via Supabase)
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
  post: Omit<Post, "id" | "created_at" | "like_count" | "comment_count">
) {
  const state = read();
  const full: Post = {
    ...post,
    id: id(),
    like_count: 0,
    comment_count: 0,
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

export { id as newId };
