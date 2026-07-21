import Link from "next/link";
import { Bell, Building2, FolderKanban, Home, Settings, Shield, WalletCards } from "lucide-react";
import { logoutAction } from "@/app/actions";
import type { AuthenticatedUser } from "@/lib/auth/session";

const clientNav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/proposals", label: "Proposals", icon: Shield },
  { href: "/payments", label: "Payments", icon: WalletCards },
  { href: "/settings/organization", label: "Organization", icon: Building2 },
];

const adminNav = [
  { href: "/admin", label: "Overview", icon: Home },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/proposals", label: "Proposals", icon: Shield },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/payments", label: "Payments", icon: WalletCards },
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

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-panel/85 p-5 lg:block">
        <Link href={mode === "admin" ? "/admin" : "/dashboard"} className="block">
          <p className="text-xs uppercase tracking-[0.24em] text-accent">Ghost AI</p>
          <p className="mt-1 text-xl font-semibold">
            {mode === "admin" ? "Portal Admin" : "Client Portal"}
          </p>
        </Link>
        <nav className="mt-8 space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/[0.06] hover:text-foreground"
              >
                <Icon size={17} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-background/85 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-sm text-muted">{organizationName ?? "Ghost AI Solutions"}</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div className="flex items-center gap-2">
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
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
