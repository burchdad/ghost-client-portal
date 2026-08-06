import Link from "next/link";
import {
  Bell,
  Building2,
  Compass,
  FolderKanban,
  Home,
  FlaskConical,
  LifeBuoy,
  Megaphone,
  Sparkles,
  Settings,
  Shield,
  WalletCards,
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import type { AuthenticatedUser } from "@/lib/auth/session";

const clientNav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/vega", label: "Vega", icon: Sparkles },
  { href: "/geo", label: "GEO", icon: Compass },
  { href: "/echo", label: "Echo", icon: Megaphone },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/proposals", label: "Proposals", icon: Shield },
  { href: "/payments", label: "Payments", icon: WalletCards },
  { href: "/requests", label: "Requests", icon: LifeBuoy },
  { href: "/settings/organization", label: "Organization", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNav = [
  { href: "/admin", label: "Overview", icon: Home },
  { href: "/vega", label: "Vega", icon: Sparkles },
  { href: "/geo", label: "GEO", icon: Compass },
  { href: "/echo", label: "Echo", icon: Megaphone },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/proposals", label: "Proposals", icon: Shield },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/payments", label: "Payments", icon: WalletCards },
  {
    href: "/admin/testing/client-lifecycle",
    label: "Lifecycle Testing",
    icon: FlaskConical,
  },
  { href: "/admin/audit", label: "Audit", icon: Settings },
];

export function PortalShell({
  children,
  user,
  organizationName,
  mode,
}: {
  children: React.ReactNode;
  user: AuthenticatedUser;
  organizationName?: string;
  mode: "client" | "admin";
}) {
  const nav = mode === "admin" ? adminNav : clientNav;
  const homeHref = mode === "admin" ? "/admin" : "/dashboard";
  const label = mode === "admin" ? "Portal Admin" : "Client Portal";

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-panel/90 p-5 shadow-2xl shadow-black/20 lg:block">
        <Link href={homeHref} className="block rounded-md px-2 py-1">
          <p className="text-xs uppercase tracking-[0.24em] text-accent">
            Ghost AI
          </p>
          <p className="mt-1 text-xl font-semibold">{label}</p>
          <p className="mt-2 text-xs text-muted">
            {mode === "admin" ? "Internal operations" : "Workspace command"}
          </p>
        </Link>
        <nav className="mt-8 space-y-1" aria-label={`${label} navigation`}>
          <p className="px-3 pb-2 text-xs uppercase tracking-[0.18em] text-muted">
            Navigation
          </p>
          <NavItems nav={nav} />
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-background/90 backdrop-blur">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-accent lg:hidden">
                Ghost AI
              </p>
              <p className="text-sm text-muted">
                {organizationName ?? "Ghost AI Solutions"}
              </p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {mode === "client" ? (
                <Link
                  href="/requests"
                  className="hidden rounded-md border border-line bg-white/[0.04] px-3 py-2 text-sm hover:border-accent sm:inline-flex"
                >
                  Ask Ghost
                </Link>
              ) : null}
              <Link
                href={mode === "admin" ? "/admin/audit" : "/notifications"}
                className="rounded-md border border-line bg-white/[0.04] p-2 hover:border-accent"
                aria-label="Notifications"
              >
                <Bell size={18} aria-hidden />
              </Link>
              <form action={logoutAction}>
                <button className="rounded-md border border-line bg-white/[0.04] px-3 py-2 text-sm hover:border-accent">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <nav
            className="flex gap-2 overflow-x-auto border-t border-line px-5 py-3 lg:hidden"
            aria-label={`${label} mobile navigation`}
          >
            <NavItems nav={nav} compact />
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavItems({
  nav,
  compact = false,
}: {
  nav: typeof clientNav;
  compact?: boolean;
}) {
  return (
    <>
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              compact
                ? "inline-flex shrink-0 items-center gap-2 rounded-md border border-line bg-white/[0.035] px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
                : "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition hover:bg-white/[0.06] hover:text-foreground"
            }
          >
            <Icon size={17} aria-hidden />
            {item.label}
            {item.href.includes("/testing/") ? (
              <span className="ml-auto rounded-sm border border-amber-200/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
                TEST DATA ONLY
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
