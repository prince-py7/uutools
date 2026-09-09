"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Calculator,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  Image as ImageIcon,
  LogOut,
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
import { Avatar } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";
import { ShellProvider, useShell } from "@/lib/shell-context";

const tools = [
  { href: "/tools/image-finder", label: "Image Finder", icon: ImageIcon },
  { href: "/tools/attendance", label: "Attendance", icon: Calculator },
  { href: "/tools/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/tools/favourites", label: "Favourites", icon: Star },
];

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
  const { composerOpen, openComposer, closeComposer, requestsOpen, openRequests, closeRequests } =
    useShell();
  const [railOpen, setRailOpen] = useState(false);
  const [toolsHover, setToolsHover] = useState(false);

  useEffect(() => {
    closeComposer();
    closeRequests();
    // Only reset overlays on navigation — keep close* callbacks out of deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const profileHref = user ? `/profile/${user.username}` : "/login";

  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl">
      {/* Left icon rail */}
      <aside
        className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-[var(--line)] bg-[color-mix(in_srgb,#07080c_92%,transparent)] backdrop-blur-xl transition-[width] duration-200 md:flex ${
          railOpen ? "w-[200px]" : "w-[72px]"
        }`}
      >
        <div className="flex items-center justify-center px-2 py-4">
          <Link href="/home" className="relative block" title="UNITIANS">
            <Image
              src="/brand/unitians-logo.png"
              alt="UNITIANS"
              width={railOpen ? 84 : 44}
              height={railOpen ? 84 : 44}
              className="object-contain drop-shadow-[0_0_18px_rgba(77,232,255,0.35)]"
              priority
            />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col items-stretch gap-1 px-2">
          <RailLink
            href="/search"
            icon={Search}
            label="Search"
            active={pathname.startsWith("/search")}
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
            className="relative mt-3"
            onMouseEnter={() => setToolsHover(true)}
            onMouseLeave={() => setToolsHover(false)}
          >
            <div
              className={`icon-btn mx-auto ${
                pathname.startsWith("/tools") ? "active" : ""
              } ${railOpen ? "!w-full !justify-start gap-3 !px-3" : ""}`}
              title="Tools"
            >
              <Wrench size={20} />
              {railOpen && <span className="text-sm font-medium">Tools</span>}
            </div>

            {(toolsHover || railOpen) && (
              <div
                className={`${
                  railOpen
                    ? "mt-1 space-y-1"
                    : "absolute left-[calc(100%+10px)] top-0 z-40 min-w-[200px] rounded-2xl border border-[var(--line)] bg-[#0a0b10]/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                }`}
              >
                {!railOpen && (
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Tools
                  </p>
                )}
                {tools.map((t) => {
                  const Icon = t.icon;
                  const active = pathname === t.href;
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        active
                          ? "bg-[rgba(77,232,255,0.1)] text-[var(--accent)]"
                          : "text-[var(--muted)] hover:bg-white/[0.03] hover:text-[var(--text)]"
                      }`}
                    >
                      <Icon size={18} />
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="mt-auto space-y-2 border-t border-[var(--line)] p-2">
          {demoMode && railOpen && (
            <p className="rounded-xl bg-[rgba(77,232,255,0.08)] px-2 py-2 text-[10px] leading-relaxed text-[var(--accent)]">
              Demo · <b>aarav</b> / password
            </p>
          )}
          {user && (
            <button
              className={`icon-btn mx-auto ${railOpen ? "!w-full !justify-start gap-3 !px-3" : ""}`}
              title="Log out"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              <LogOut size={18} />
              {railOpen && <span className="text-sm">Log out</span>}
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label={railOpen ? "Collapse sidebar" : "Expand sidebar"}
          onClick={() => setRailOpen((v) => !v)}
          className="absolute top-1/2 -right-3 z-40 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-[var(--line-strong)] bg-[#0c0e14] text-[var(--muted)] shadow-lg hover:text-[var(--accent)]"
        >
          {railOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>

      <main className="min-w-0 flex-1 pb-24">{children}</main>

      {/* Instagram-style footer */}
      <nav className="footer-nav fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto grid max-w-6xl grid-cols-4 items-center px-2 py-2 md:px-6">
          <FooterItem
            href="/home"
            icon={Home}
            label="Home"
            active={pathname === "/home"}
          />
          <button
            type="button"
            className={`flex flex-col items-center gap-1 py-1 text-[10px] ${
              requestsOpen ? "text-[var(--accent)]" : "text-[var(--muted)]"
            }`}
            onClick={openRequests}
          >
            <UserPlus size={22} />
            Requests
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-1 py-1 text-[10px] text-[var(--muted)]"
            onClick={openComposer}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(77,232,255,0.35)] bg-[linear-gradient(135deg,rgba(77,232,255,0.18),rgba(255,79,216,0.12))] text-[var(--accent)] shadow-[0_0_20px_rgba(77,232,255,0.2)]">
              <PlusSquare size={22} />
            </span>
            Post
          </button>
          <FooterItem
            href={profileHref}
            icon={UserRound}
            label="Profile"
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
            className="card w-full max-w-lg rounded-b-none sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Create post
              </h2>
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
            className="card w-full max-w-md rounded-b-none sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
                Friend requests
              </h2>
              <button className="icon-btn" onClick={closeRequests} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 p-5 text-sm text-[var(--muted)]">
              <p>No requests yet.</p>
              <p className="text-xs leading-relaxed">
                Friend requests & chat ship in Phase 2. This button is ready — incoming
                requests will show up here.
              </p>
            </div>
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
  icon: React.ComponentType<{ size?: number }>;
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
      <Icon size={20} />
      {expanded && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
}

function FooterItem({
  href,
  icon: Icon,
  label,
  active,
  avatar,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
  avatar?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-1 text-[10px] ${
        active ? "text-[var(--accent)]" : "text-[var(--muted)]"
      }`}
    >
      {avatar ?? <Icon size={22} />}
      {label}
    </Link>
  );
}
