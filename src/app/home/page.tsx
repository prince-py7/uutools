"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StudyFiltersBar } from "@/components/feed/Composer";
import { PostCard } from "@/components/feed/PostCard";
import { StoriesRail } from "@/components/social/StoriesRail";
import { isVerifiedForFilter, sortFeedPosts } from "@/lib/badges";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";

export default function HomePage() {
  const { user, ready } = useAuth();
  const catalog = useDemoCatalog();
  const router = useRouter();

  const [studyOnly, setStudyOnly] = useState(false);
  const [classOnly, setClassOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [studyType, setStudyType] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!user.onboarding_complete) router.replace("/onboarding");
  }, [ready, user, router]);

  const posts = useMemo(() => {
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
          {posts.length === 0 ? (
            <div className="card p-8 text-center text-[var(--muted)]">
              No posts match these filters yet.
            </div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      </div>
    </AppShell>
  );
}
