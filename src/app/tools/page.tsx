"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  Calculator,
  CalendarDays,
  Image as ImageIcon,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/Loading";
import { useAuth } from "@/lib/auth-context";
import {
  canSendClassAnnouncements,
  fetchMyClassRoles,
} from "@/lib/announcements";

const BASE_TOOLS = [
  {
    href: "/tools/image-finder",
    title: "Image Finder",
    blurb: "Find and download campus images",
    icon: ImageIcon,
  },
  {
    href: "/tools/attendance",
    title: "Attendance",
    blurb: "Project % from your timetable",
    icon: Calculator,
  },
  {
    href: "/tools/timetable",
    title: "Timetable",
    blurb: "Your weekly class grid",
    icon: CalendarDays,
  },
  {
    href: "/tools/favourites",
    title: "Favourites",
    blurb: "Posts you saved",
    icon: Star,
  },
];

export default function ToolsPage() {
  const { user, ready } = useAuth();
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    if (!user) {
      setStaff(false);
      return;
    }
    let cancelled = false;
    void fetchMyClassRoles(user.id).then((roles) => {
      if (!cancelled) setStaff(canSendClassAnnouncements(user, roles));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tools = [
    ...BASE_TOOLS,
    ...(staff
      ? [
          {
            href: "/tools/announcements",
            title: "Class announcements",
            blurb: "Message the whole class",
            icon: Bell,
          },
        ]
      : []),
  ];

  if (!ready) {
    return (
      <AppShell>
        <LoadingState label="Loading tools…" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4 px-3 py-6 md:px-0">
        <div>
          <h1 className="text-2xl font-bold">Tools</h1>
          <p className="text-sm text-[var(--muted)]">
            Campus utilities in one place
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="card flex items-start gap-3 p-4 transition hover:bg-[#161616]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1a1a1a]">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{tool.title}</span>
                  <span className="text-xs text-[var(--muted)]">{tool.blurb}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
