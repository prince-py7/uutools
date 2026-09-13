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
  Menu,
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
import { notifyFeedUpdated } from "@/lib/feed";
import { FriendRequestsPanel } from "@/components/social/FriendRequests";
import { Avatar } from "@/components/ui/Badge";
import { useAuth, useDemoCatalog } from "@/lib/auth-context";
import { countPendingFriendRequests } from "@/lib/friends";
import { ShellProvider, useShell } from "@/lib/shell-context";
import { verificationReminder } from "@/lib/verification";

const tools = [
  { href: "/tools/image-finder", label: "Image Finder", icon: ImageIcon },
  { href: "/tools/attendance", label: "Attendance", icon: Calculator },
  { href: "/tools/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/tools/favourites", label: "Favourites", icon: Star },
];

const COLLAPSED = 56;
const EXPANDED = 200;

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
  const { user, logout, demoMode } = useAuth();
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsHover, setToolsHover] = useState(false);

  useEffect(() => {
    closeComposer();
    closeRequests();
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      return;
    }
    if (demoMode) {
      setPendingCount(
        catalog.friendRequests.filter(
          (r) => r.to_user_id === user.id && r.status === "pending"
        ).length
      );
      return;
    }
    let cancelled = false;
    void countPendingFriendRequests(user.id).then((n) => {
      if (!cancelled) setPendingCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [user, demoMode, catalog.friendRequests]);

  const reminder = user ? verificationReminder(user) : null;
  const profileHref = user ? `/profile/${user.username}` : "/login";
  const railW = railOpen ? EXPANDED : COLLAPSED;

  const navLinks = useMemo(
    () => [
      ...(user?.is_admin
        ? [{ href: "/admin", label: "Developer", icon: Settings }]
        : []),
    ],
    [user?.is_admin]
  );

  async function handleLogout() {
    await logout();
    setMobileOpen(false);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-black text-[var(--text)]">
      {/* Desktop sidebar */}
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

        <nav className="flex flex-1 flex-col gap-0.5 px-1.5">
          {navLinks.map((item) => (
            <RailLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname.startsWith(item.href)}
              expanded={railOpen}
            />
          ))}

          <div
            className="relative mt-1"
            onMouseEnter={() => setToolsHover(true)}
            onMouseLeave={() => setToolsHover(false)}
          >
            <div
              title="Tools"
              className={`rail-item ${railOpen ? "expanded" : "mx-auto"} ${
                pathname.startsWith("/tools") ? "active" : ""
              }`}
            >
              <Wrench size={20} strokeWidth={1.75} className="shrink-0" />
              {railOpen && <span className="truncate text-sm">Tools</span>}
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
                      <Icon size={17} strokeWidth={1.75} className="shrink-0" />
                      <span>{t.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="border-t border-[var(--line)] p-1.5">
          {user && (
            <button
              type="button"
              title="Log out"
              className={`rail-item ${railOpen ? "expanded" : "mx-auto"}`}
              onClick={handleLogout}
            >
              <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
              {railOpen && <span className="truncate text-sm">Log out</span>}
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label={railOpen ? "Collapse sidebar" : "Expand sidebar"}
          onClick={() => setRailOpen((v) => !v)}
          className="absolute top-1/2 -right-3 z-40 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-[#121212] text-[var(--muted)] hover:text-white"
        >
          {railOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </aside>

      {/* Top bar: Search + Messages (profile slot → Messages) */}
      <header
        className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-[var(--line)] bg-black/95 px-2 backdrop-blur md:ml-[var(--rail-w)] md:justify-end"
        style={{ ["--rail-w" as string]: `${railW}px` }}
      >
        <button
          type="button"
          aria-label="Open menu"
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-[#1a1a1a] md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={22} strokeWidth={1.75} />
        </button>
        <Link href="/home" className="flex items-center gap-2 md:hidden">
          <Image
            src="/brand/unitians-logo.png"
            alt="Unitians"
            width={22}
            height={22}
            className="object-contain"
          />
          <span className="text-[15px] font-semibold tracking-tight">Unitians</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <Link
            href="/search"
            className={`grid h-10 w-10 place-items-center rounded-lg hover:bg-[#1a1a1a] ${
              pathname.startsWith("/search") ? "text-white" : "text-[var(--text)]"
            }`}
            aria-label="Search"
            title="Search"
          >
            <Search size={22} strokeWidth={pathname.startsWith("/search") ? 2.25 : 1.75} />
          </Link>
          <Link
            href="/messages"
            className={`grid h-10 w-10 place-items-center rounded-lg hover:bg-[#1a1a1a] ${
              pathname.startsWith("/messages") ? "text-white" : "text-[var(--text)]"
            }`}
            aria-label="Messages"
            title="Messages"
          >
            <MessageCircle
              size={22}
              strokeWidth={pathname.startsWith("/messages") ? 2.25 : 1.75}
            />
          </Link>
        </div>
      </header>

      {/* Mobile slide-out drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col border-r border-[var(--line)] bg-[#0a0a0a] shadow-2xl">
            <div className="flex h-12 items-center justify-between border-b border-[var(--line)] px-3">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#1a1a1a]"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                      active
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[var(--muted)] hover:bg-[#141414] hover:text-white"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.75} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <p className="px-3 pt-3 pb-1 text-[11px] font-medium tracking-wide text-[var(--muted)] uppercase">
                Tools
              </p>
              {tools.map((t) => {
                const Icon = t.icon;
                const active = pathname === t.href;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                      active
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[var(--muted)] hover:bg-[#141414] hover:text-white"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.75} className="shrink-0" />
                    <span>{t.label}</span>
                  </Link>
                );
              })}
            </nav>
            {user && (
              <div className="border-t border-[var(--line)] p-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-[var(--muted)] hover:bg-[#141414] hover:text-white"
                  onClick={handleLogout}
                >
                  <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

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
                  notifyFeedUpdated();
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
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  label: string;
  active: boolean;
  expanded: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`rail-item ${expanded ? "expanded" : "mx-auto"} ${active ? "active" : ""}`}
    >
      <Icon size={20} strokeWidth={1.75} className="shrink-0" />
      {expanded && <span className="truncate text-sm">{label}</span>}
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
