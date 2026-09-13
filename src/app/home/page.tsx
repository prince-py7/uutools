"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StudyFiltersBar } from "@/components/feed/Composer";
import { PostCard } from "@/components/feed/PostCard";
import { StoriesRail } from "@/components/social/StoriesRail";
import { isVerifiedForFilter, sortFeedPosts } from "@/lib/badges";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import {
  fetchCollegeClasses,
  fetchClassRolesForUsers,
  fetchPopularThreshold,
} from "@/lib/directory";
import { fetchCollegeFeed, type FeedItem } from "@/lib/feed";
import { createClient } from "@/lib/supabase/client";
import type { ClassRole, ClassRow, Section } from "@/lib/types";

export default function HomePage() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();

  const [studyOnly, setStudyOnly] = useState(false);
  const [classOnly, setClassOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studyType, setStudyType] = useState("");
  const [liveItems, setLiveItems] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [feedTick, setFeedTick] = useState(0);
  const [popularThreshold, setPopularThreshold] = useState(
    catalog.popularThreshold
  );
  const [roles, setRoles] = useState<ClassRole[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.onboarding_complete) router.replace("/onboarding");
  }, [ready, user, router]);

  useEffect(() => {
    const onUpdate = () => setFeedTick((t) => t + 1);
    window.addEventListener("uu-feed-updated", onUpdate);
    return () => window.removeEventListener("uu-feed-updated", onUpdate);
  }, []);

  useEffect(() => {
    if (demoMode || !user?.college_id) return;
    let cancelled = false;
    void (async () => {
      const [thr, classRows] = await Promise.all([
        fetchPopularThreshold(),
        fetchCollegeClasses(user.college_id!),
      ]);
      if (cancelled) return;
      setPopularThreshold(thr);
      setClasses(classRows);
      if (classRows.length) {
        const supabase = createClient();
        const { data } = await supabase
          .from("sections")
          .select("*")
          .in(
            "class_id",
            classRows.map((c) => c.id)
          );
        if (!cancelled) setSections((data as Section[]) || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoMode, user?.college_id]);

    const loadLiveFeed = useCallback(async () => {
    if (!user?.college_id || demoMode) return;
    setLoadingFeed(true);
    setFeedError("");
    const res = await fetchCollegeFeed({
      collegeId: user.college_id,
      userId: user.id,
      classOnly,
      classId: classOnly ? user.class_id : classId || null,
      sectionId: sectionId || null,
      studyOnly,
      studyType: studyType || undefined,
      subjectId: subjectId || undefined,
    });
    if (res.error) setFeedError(res.error);
    let items = res.items;
    if (studyOnly && verifiedOnly) {
      items = items.filter((i) =>
        isVerifiedForFilter(i.post, popularThreshold)
      );
    }
    if (studyOnly && !verifiedOnly) {
      items = [...items].sort(
        (a, b) => b.post.like_count - a.post.like_count
      );
    } else {
      const sorted = sortFeedPosts(
        items.map((i) => i.post),
        user
      );
      const map = new Map(items.map((i) => [i.post.id, i]));
      items = sorted
        .map((p) => map.get(p.id))
        .filter((x): x is FeedItem => Boolean(x));
    }
    setLiveItems(items);
    const authorIds = [...new Set(items.map((i) => i.author.id))];
    setRoles(await fetchClassRolesForUsers(authorIds));
    setLoadingFeed(false);
  }, [
    user,
    demoMode,
    classOnly,
    classId,
    sectionId,
    studyOnly,
    studyType,
    subjectId,
    verifiedOnly,
    popularThreshold,
  ]);

  useEffect(() => {
    if (!ready || !user || demoMode) return;
    void loadLiveFeed();
  }, [ready, user, demoMode, loadLiveFeed, feedTick]);

  const demoPosts = useMemo(() => {
    let list = catalog.posts.filter((p) => {
      if (user?.college_id && p.college_id !== user.college_id) return false;
      if (classOnly && user?.class_id && p.class_id !== user.class_id) return false;
      if (studyOnly && p.kind !== "study") return false;
      if (studyOnly && classId && p.class_id !== classId) return false;
      if (studyOnly && sectionId && p.section_id !== sectionId) return false;
      if (studyOnly && subjectId && p.subject_id !== subjectId) return false;
      if (studyOnly && studyType && p.study_type !== studyType) return false;
      if (studyOnly && verifiedOnly) {
        return isVerifiedForFilter(p, catalog.popularThreshold);
      }
      return true;
    });

    if (studyOnly && !verifiedOnly) {
      list = [...list].sort((a, b) => b.like_count - a.like_count);
    } else {
      list = sortFeedPosts(list, user);
    }
    return list;
  }, [
    catalog.posts,
    catalog.popularThreshold,
    user,
    studyOnly,
    classOnly,
    verifiedOnly,
    classId,
    sectionId,
    subjectId,
    studyType,
  ]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-3 px-3 pt-3 md:px-4 md:pt-4">
        <StoriesRail />

        <StudyFiltersBar
          studyOnly={studyOnly}
          setStudyOnly={setStudyOnly}
          classOnly={classOnly}
          setClassOnly={setClassOnly}
          verifiedOnly={verifiedOnly}
          setVerifiedOnly={setVerifiedOnly}
          classId={classId}
          setClassId={setClassId}
          sectionId={sectionId}
          setSectionId={setSectionId}
          subjectId={subjectId}
          setSubjectId={setSubjectId}
          studyType={studyType}
          setStudyType={setStudyType}
        />

        <div className="space-y-4 pb-4">
          {feedError && (
            <div className="card p-4 text-sm text-[var(--danger)]">{feedError}</div>
          )}
          {demoMode ? (
            demoPosts.length === 0 ? (
              <div className="card p-8 text-center text-[var(--muted)]">
                No posts match these filters yet.
              </div>
            ) : (
              demoPosts.map((p) => <PostCard key={p.id} post={p} />)
            )
          ) : loadingFeed ? (
            <div className="card p-8 text-center text-[var(--muted)]">
              Loading feed…
            </div>
          ) : liveItems.length === 0 ? (
            <div className="card p-8 text-center text-[var(--muted)]">
              No posts yet — tap + to share the first one.
            </div>
          ) : (
            liveItems.map((item) => (
              <PostCard
                key={item.post.id}
                post={item.post}
                author={item.author}
                initialLiked={item.liked}
                initialFavoured={item.favoured}
                initialComments={item.comments}
                roles={roles}
                classes={classes}
                sections={sections}
                popularThreshold={popularThreshold}
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
