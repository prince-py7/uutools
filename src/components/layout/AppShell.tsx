"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Calculator,
  CalendarDays,
  Home,
  Image as ImageIcon,
  LogOut,
  Search,
  Settings,
  Star,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const tools = [
  { href: "/tools/image-finder", label: "Image Finder", icon: ImageIcon },
  { href: "/tools/attendance", label: "Attendance", icon: Calculator },
  { href: "/tools/timetable", label: "Timetable", icon: CalendarDays },
  { href: "/tools/favourites", label: "Favourites", icon: Star },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, demoMode } = useAuth();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-0 md:gap-6 md:px-4 md:py-4">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_80%,transparent)] p-4 backdrop-blur md:flex">
        <Link href="/home" className="mb-8">
          <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
            UU <span className="text-[var(--accent)]">Community</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">United University</p>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          <NavItem href="/home" icon={Home} label="Home" active={pathname === "/home"} />
          <NavItem
            href="/search"
            icon={Search}
            label="Search"
            active={pathname.startsWith("/search")}
          />
          {user && (
            <NavItem
              href={`/profile/${user.username}`}
              icon={BookOpen}
              label="Profile"
              active={pathname.startsWith("/profile")}
            />
          )}
          {user?.is_admin && (
            <NavItem
              href="/admin"
              icon={Settings}
              label="Developer"
              active={pathname.startsWith("/admin")}
            />
          )}

          <div className="mt-6 mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            <Wrench size={14} /> Tools
          </div>
          {tools.map((t) => (
            <NavItem
              key={t.href}
              href={t.href}
              icon={t.icon}
              label={t.label}
              active={pathname === t.href}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-[var(--line)] pt-4">
          {demoMode && (
            <p className="rounded-lg bg-[rgba(240,180,41,0.1)] px-3 py-2 text-xs text-[var(--accent)]">
              Demo mode — no Supabase keys yet. Try login <b>aarav</b> / <b>password</b>
            </p>
          )}
          {user && (
            <button
              className="btn btn-ghost w-full"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              <LogOut size={16} /> Log out
            </button>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--line)] bg-[var(--bg-elevated)] md:hidden">
        {[
          { href: "/home", icon: Home, label: "Home" },
          { href: "/search", icon: Search, label: "Search" },
          { href: "/tools/image-finder", icon: Wrench, label: "Tools" },
          {
            href: user ? `/profile/${user.username}` : "/login",
            icon: BookOpen,
            label: "Me",
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] ${
                active ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[rgba(240,180,41,0.12)] text-[var(--accent)]"
          : "text-[var(--muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text)]"
      }`}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
