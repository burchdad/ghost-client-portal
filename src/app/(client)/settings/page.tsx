import Link from "next/link";
import { ArrowRight, Building2, CreditCard, UsersRound } from "lucide-react";
import { PageHero, SectionPanel } from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";

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
];

export default async function SettingsPage() {
  const { organization } = await requireOrganizationMembership();

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Settings"
        title={`Workspace settings for ${organization.name}`}
        body="Manage organization profile, team access, billing readiness, and workspace-level controls as the client administration layer expands."
        metrics={[
          { label: "Organization", value: "Live", detail: "Profile enabled" },
          { label: "Team", value: "Staged", detail: "Invite controls next" },
          { label: "Billing", value: "Stripe", detail: "Payment records live" },
        ]}
      />

      <SectionPanel title="Settings areas" eyebrow="Client administration">
        <div className="grid gap-4 md:grid-cols-3">
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
    </section>
  );
}
