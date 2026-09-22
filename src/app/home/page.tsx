"use client";

import { LoadingState, SkeletonRows, Spinner } from "@/components/ui/Loading";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  FEED_PAGE_SIZE,
  fetchCollegeFeed,
  type FeedItem,
} from "@/lib/feed";
import { createClient } from "@/lib/supabase/client";
import type { ClassRole, ClassRow, Post, Section } from "@/lib/types";

function HomePageInner() {
  const { user, ready, demoMode } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusPostId = searchParams.get("post");

  const [studyOnly, setStudyOnly] = useState(false);
  const [classOnly, setClassOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studyType, setStudyType] = useState("");
  const [liveItems, setLiveItems] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [feedError, setFeedError] = useState("");
  const [feedTick, setFeedTick] = useState(0);
  const [demoVisible, setDemoVisible] = useState(FEED_PAGE_SIZE);
  const [popularThreshold, setPopularThreshold] = useState(
    catalog.popularThreshold
  );
  const [roles, setRoles] = useState<ClassRole[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const filterKey = useMemo(
    () =>
      [
        classOnly,
        classId,
        sectionId,
        studyOnly,
        studyType,
        subjectId,
        verifiedOnly,
      ].join("|"),
    [
      classOnly,
      classId,
      sectionId,
      studyOnly,
      studyType,
      subjectId,
      verifiedOnly,
    ]
  );

  const applyClientSort = useCallback(
    (items: FeedItem[]) => {
      let next = items;
      if (studyOnly && verifiedOnly) {
        next = next.filter((i) =>
          isVerifiedForFilter(i.post, popularThreshold)
        );
      }
      if (studyOnly && !verifiedOnly) {
        next = [...next].sort(
          (a, b) => b.post.like_count - a.post.like_count
        );
      } else if (user) {
        const sorted = sortFeedPosts(
          next.map((i) => i.post),
          user
        );
        const map = new Map(next.map((i) => [i.post.id, i]));
        next = sorted
          .map((p) => map.get(p.id))
          .filter((x): x is FeedItem => Boolean(x));
      }
      return next;
    },
    [studyOnly, verifiedOnly, popularThreshold, user]
  );

  const loadLiveFeed = useCallback(
    async (mode: "reset" | "more") => {
      if (!user?.college_id || demoMode) return;
      if (mode === "more") {
        if (loadingMore || !hasMore || !cursor) return;
        setLoadingMore(true);
      } else {
        setLoadingFeed(true);
        setFeedError("");
        setHasMore(true);
        setCursor(null);
      }

      const res = await fetchCollegeFeed({
        collegeId: user.college_id,
        userId: user.id,
        classOnly,
        classId: classOnly ? user.class_id : classId || null,
        sectionId: sectionId || null,
        studyOnly,
        studyType: studyType || undefined,
        subjectId: subjectId || undefined,
        before: mode === "more" ? cursor : null,
        limit: FEED_PAGE_SIZE,
        includeComments: false,
      });

      if (res.error) setFeedError(res.error);

      if (mode === "reset") {
        const items = applyClientSort(res.items);
        setLiveItems(items);
        const authorIds = [...new Set(items.map((i) => i.author.id))];
        setRoles(await fetchClassRolesForUsers(authorIds));
      } else {
        setLiveItems((prev) => {
          const seen = new Set(prev.map((i) => i.post.id));
          const appended = res.items.filter((i) => !seen.has(i.post.id));
          const merged = [...prev, ...appended];
          const authorIds = [
            ...new Set(merged.map((i) => i.author.id)),
          ];
          void fetchClassRolesForUsers(authorIds).then(setRoles);
          return merged;
        });
      }

      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
      setLoadingFeed(false);
      setLoadingMore(false);
    },
    [
      user,
      demoMode,
      classOnly,
      classId,
      sectionId,
      studyOnly,
      studyType,
      subjectId,
      cursor,
      hasMore,
      loadingMore,
      applyClientSort,
    ]
  );

  // Reset feed when filters / tick change
  useEffect(() => {
    if (!ready || !user || demoMode) return;
    void loadLiveFeed("reset");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, demoMode, filterKey, feedTick]);

  // Reset demo pagination when filters change
  useEffect(() => {
    setDemoVisible(FEED_PAGE_SIZE);
  }, [filterKey, feedTick]);

  const demoPosts = useMemo(() => {
    let list = catalog.posts.filter((p) => {
      if (user?.college_id && p.college_id !== user.college_id) return false;
      if (classOnly && user?.class_id && p.class_id !== user.class_id)
        return false;
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

  const demoShown = demoPosts.slice(0, demoVisible);
  const demoHasMore = demoVisible < demoPosts.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (demoMode) {
          if (demoHasMore) setDemoVisible((n) => n + FEED_PAGE_SIZE);
          return;
        }
        void loadLiveFeed("more");
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [demoMode, demoHasMore, loadLiveFeed, liveItems.length, loadingFeed]);

  useEffect(() => {
    if (!focusPostId) return;
    if (loadingFeed && !demoMode) return;
    const id = `post-${focusPostId}`;
    const tryFocus = () => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("post-focus-ring");
      window.setTimeout(() => el.classList.remove("post-focus-ring"), 3200);
      return true;
    };
    if (tryFocus()) return;
    const t = window.setTimeout(() => {
      tryFocus();
    }, 250);
    return () => window.clearTimeout(t);
  }, [focusPostId, loadingFeed, demoMode, liveItems, demoShown]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Loading…" />
      </div>
    );
  }

  function renderCards(posts: Post[] | FeedItem[], live: boolean) {
    if (live) {
      return (posts as FeedItem[]).map((item) => (
        <PostCard
          key={item.post.id}
          post={item.post}
          author={item.author}
          initialLiked={item.liked}
          initialFavoured={item.favoured}
          initialComments={item.comments}
          people={item.people}
          roles={roles}
          classes={classes}
          sections={sections}
          popularThreshold={popularThreshold}
        />
      ));
    }
    return (posts as Post[]).map((p) => <PostCard key={p.id} post={p} />);
  }

  const showEmpty =
    demoMode
      ? demoPosts.length === 0
      : !loadingFeed && liveItems.length === 0;

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
            <div className="card p-4 text-sm text-[var(--danger)]">
              {feedError}
            </div>
          )}
          {demoMode ? (
            showEmpty ? (
              <div className="card p-8 text-center text-[var(--muted)]">
                No posts match these filters yet.
              </div>
            ) : (
              renderCards(demoShown, false)
            )
          ) : loadingFeed && liveItems.length === 0 ? (
            <SkeletonRows rows={3} />
          ) : showEmpty ? (
            <div className="card p-8 text-center text-[var(--muted)]">
              No posts yet — tap + to share the first one.
            </div>
          ) : (
            renderCards(liveItems, true)
          )}

          <div ref={sentinelRef} className="h-8" aria-hidden />
          {(loadingMore || (demoMode && demoHasMore)) && (
            <div className="flex justify-center py-3 text-[var(--muted)]">
              <Spinner size={20} />
            </div>
          )}
          {!demoMode && !loadingFeed && !hasMore && liveItems.length > 0 ? (
            <p className="pb-4 text-center text-xs text-[var(--muted)]">
              You&apos;re all caught up
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingState label="Loading…" />
        </div>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}
