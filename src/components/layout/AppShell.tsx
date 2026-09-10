"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  Image as ImageIcon,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  Settings,
  Star,
  UserPlus,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Composer } from "@/components/feed/Composer";
import { FriendRequestsPanel } from "@/components/social/FriendRequests";
import { Avatar } from "@/components/ui/Badge";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { ShellProvider, useShell } from "@/lib/shell-context";
import { verificationReminder } from "@/lib/verification";

const tools = [
  { href: "/tools/image-finder", label: "Image Finder", icon: ImageIcon },
  { href: "/tools/attendance", label: "Attendance", icon: Calculator },
  { href: "/tools/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/tools/favourites", label: "Favourites", icon: Star },
];

const COLLAPSED = 56;
const EXPANDED = 180;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellProvider>
      <AppShellInner>{children}</AppShellInner>
    </ShellProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const catalog = useDemoCatalog();
  const {
    composerOpen,
    openComposer,
    closeComposer,
    requestsOpen,
    openRequests,
    closeRequests,
  } = useShell();
  const [railOpen, setRailOpen] = useState(false);
  const [toolsHover, setToolsHover] = useState(false);

  useEffect(() => {
    closeComposer();
    closeRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const pendingCount = useMemo(
    () =>
      user
        ? catalog.friendRequests.filter(
            (r) => r.to_user_id === user.id && r.status === "pending"
          ).length
        : 0,
    [catalog.friendRequests, user]
  );

  const reminder = user ? verificationReminder(user) : null;
  const profileHref = user ? `/profile/${user.username}` : "/login";
  const railW = railOpen ? EXPANDED : COLLAPSED;

  return (
    <div className="min-h-screen bg-black text-[var(--text)]">
      <aside
        style={{ width: railW }}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--line)] bg-black transition-[width] duration-150 ease-out md:flex"
      >
        <div className="flex h-14 items-center justify-center">
          <Link href="/home" title="Unitians">
            <Image
              src="/brand/unitians-logo.png"
              alt="Unitians"
              width={26}
              height={26}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-1">
          <RailLink
            href="/search"
            icon={Search}
            label="Search"
            active={pathname.startsWith("/search")}
            expanded={railOpen}
          />
          <RailLink
            href="/messages"
            icon={MessageCircle}
            label="Messages"
            active={pathname.startsWith("/messages")}
            expanded={railOpen}
          />
          {user?.is_admin && (
            <RailLink
              href="/admin"
              icon={Settings}
              label="Developer"
              active={pathname.startsWith("/admin")}
              expanded={railOpen}
            />
          )}

          <div
            className="relative mt-1"
            onMouseEnter={() => setToolsHover(true)}
            onMouseLeave={() => setToolsHover(false)}
          >
            <div
              title="Tools"
              className={`icon-btn mx-auto ${pathname.startsWith("/tools") ? "active" : ""} ${
                railOpen ? "!w-full !justify-start gap-3 !px-3" : ""
              }`}
            >
              <Wrench size={20} strokeWidth={1.75} />
              {railOpen && <span className="text-sm">Tools</span>}
            </div>

            {(toolsHover || railOpen) && (
              <div
                className={
                  railOpen
                    ? "mt-0.5 space-y-0.5"
                    : "absolute top-0 left-[calc(100%+6px)] z-40 w-44 rounded-lg border border-[var(--line)] bg-[#121212] p-1 shadow-xl"
                }
              >
                {!railOpen && (
                  <p className="px-2 py-1 text-[11px] text-[var(--muted)]">Tools</p>
                )}
                {tools.map((t) => {
                  const Icon = t.icon;
                  const active = pathname === t.href;
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-sm ${
                        active
                          ? "bg-[#1a1a1a] text-white"
                          : "text-[var(--muted)] hover:bg-[#1a1a1a] hover:text-white"
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.75} />
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="border-t border-[var(--line)] p-1">
          {user && (
            <button
              title="Log out"
              className={`icon-btn mx-auto ${railOpen ? "!w-full !justify-start gap-3 !px-3" : ""}`}
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              <LogOut size={18} strokeWidth={1.75} />
              {railOpen && <span className="text-sm">Log out</span>}
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label={railOpen ? "Collapse" : "Expand"}
          onClick={() => setRailOpen((v) => !v)}
          className="absolute top-1/2 -right-3 z-40 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-[#121212] text-[var(--muted)] hover:text-white"
        >
          {railOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </aside>

      <div
        className="shell-main transition-[padding-left] duration-150 ease-out"
        style={{ ["--rail-w" as string]: `${railW}px` }}
      >
        <div className="mx-auto w-full max-w-[630px]">
          {reminder && (
            <div className="mx-3 mt-3 rounded-lg border border-[var(--line)] bg-[#121212] px-3 py-2 text-xs text-[var(--muted)] md:mx-0">
              {reminder}{" "}
              <Link href="/profile/edit" className="text-[var(--accent)]">
                Account settings
              </Link>
            </div>
          )}
          {children}
        </div>
      </div>

      <nav className="footer-nav fixed inset-x-0 bottom-0 z-40 h-12">
        <div className="mx-auto grid h-full max-w-[630px] grid-cols-4">
          <FooterItem href="/home" icon={Home} active={pathname === "/home"} />
          <button
            type="button"
            aria-label="Friend requests"
            onClick={openRequests}
            className={`relative flex items-center justify-center ${
              requestsOpen ? "text-white" : "text-[var(--text)]"
            }`}
          >
            <UserPlus size={24} strokeWidth={1.75} />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-[calc(50%-14px)] grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="Create post"
            onClick={openComposer}
            className="flex items-center justify-center text-[var(--text)]"
          >
            <PlusSquare size={24} strokeWidth={1.75} />
          </button>
          <FooterItem
            href={profileHref}
            icon={UserRound}
            active={pathname.startsWith("/profile")}
            avatar={
              user ? (
                <Avatar name={user.display_name} url={user.avatar_url} size={24} />
              ) : undefined
            }
          />
        </div>
      </nav>

      {composerOpen && (
        <div className="modal-backdrop" onClick={closeComposer}>
          <div
            className="card w-full max-w-lg overflow-hidden rounded-t-xl sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-[15px] font-semibold">Create post</h2>
              <button className="icon-btn" onClick={closeComposer} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <Composer
                onPosted={() => {
                  closeComposer();
                  if (pathname !== "/home") router.push("/home");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {requestsOpen && (
        <div className="modal-backdrop" onClick={closeRequests}>
          <div
            className="card w-full max-w-md overflow-hidden rounded-t-xl sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-[15px] font-semibold">Friend requests</h2>
              <button className="icon-btn" onClick={closeRequests} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <FriendRequestsPanel onClose={closeRequests} />
          </div>
        </div>
      )}
    </div>
  );
}

function RailLink({
  href,
  icon: Icon,
  label,
  active,
  expanded,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`icon-btn mx-auto ${active ? "active" : ""} ${
        expanded ? "!w-full !justify-start gap-3 !px-3" : ""
      }`}
    >
      <Icon size={20} strokeWidth={1.75} />
      {expanded && <span className="text-sm">{label}</span>}
    </Link>
  );
}

function FooterItem({
  href,
  icon: Icon,
  active,
  avatar,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  active: boolean;
  avatar?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center ${active ? "text-white" : "text-[var(--text)]"}`}
    >
      {avatar ?? <Icon size={24} strokeWidth={active ? 2.25 : 1.75} />}
    </Link>
  );
}
