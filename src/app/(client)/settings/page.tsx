import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Building2,
  CreditCard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { PageHero, SectionPanel, StatusBadge } from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import {
  getNotificationPreferences,
  notificationPreferenceKeys,
  saveNotificationPreferencesAction,
} from "./actions";

const settingsLinks = [
  {
    href: "/settings/organization",
    title: "Organization",
    body: "Client identity, account status, and role context.",
    icon: Building2,
  },
  {
    href: "/settings/team",
    title: "Team",
    body: "Members, invitations, and future permission controls.",
    icon: UsersRound,
  },
  {
    href: "/settings/billing",
    title: "Billing",
    body: "Billing contacts, payment methods, and receipt preferences.",
    icon: CreditCard,
  },
  {
    href: "/settings/security",
    title: "Security",
    body: "Password reset, active sessions, and MFA readiness.",
    icon: ShieldCheck,
  },
];

const preferenceLabels: Record<
  (typeof notificationPreferenceKeys)[number],
  string
> = {
  proposals: "Proposal updates",
  payments: "Payment and receipt alerts",
  projects: "Project milestones",
  vega: "Vega lead activity",
  geo: "GEO visibility updates",
  echo: "Echo marketing tactics",
  requests: "Support request updates",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string }>;
}) {
  const { user, organization } = await requireClientWorkspace();
  const preferences = await getNotificationPreferences(user.id);
  const notice = (await searchParams)?.notice;

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Settings"
        title={`Workspace settings for ${organization.name}`}
        body="Manage organization profile, team access, billing readiness, and workspace-level controls as the client administration layer expands."
        metrics={[
          { label: "Organization", value: "Live", detail: "Profile enabled" },
          {
            label: "Alerts",
            value: "Configurable",
            detail: "Preferences live",
          },
          { label: "Billing", value: "Stripe", detail: "Payment records live" },
        ]}
      />

      {notice ? (
        <p className="rounded-md border border-accent/35 bg-accent/10 px-4 py-3 text-sm text-accent">
          {notice}
        </p>
      ) : null}

      <SectionPanel title="Settings areas" eyebrow="Client administration">
        <div className="grid gap-4 md:grid-cols-4">
          {settingsLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-line bg-white/[0.035] p-5 transition hover:border-accent hover:bg-white/[0.055]"
              >
                <Icon size={22} className="text-accent" aria-hidden />
                <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm text-accent">
                  Open
                  <ArrowRight size={16} aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Notification preferences"
        eyebrow="Client alerts"
        aside={<StatusBadge tone="accent">Saved in this browser</StatusBadge>}
      >
        <form action={saveNotificationPreferencesAction} className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            {notificationPreferenceKeys.map((key) => (
              <label
                key={key}
                htmlFor={`notification-${key}`}
                className="flex items-start gap-3 rounded-md border border-line bg-white/[0.035] p-4"
              >
                <input
                  id={`notification-${key}`}
                  type="checkbox"
                  name={key}
                  defaultChecked={preferences[key]}
                  className="mt-1 h-4 w-4 accent-[var(--accent)]"
                />
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    <BellRing size={15} className="text-accent" aria-hidden />
                    {preferenceLabels[key]}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted">
                    Receive client-safe portal and email-ready alerts for this
                    workspace category.
                  </span>
                </span>
              </label>
            ))}
          </div>
          <button className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
            Save notification preferences
          </button>
        </form>
      </SectionPanel>
    </section>
  );
}
