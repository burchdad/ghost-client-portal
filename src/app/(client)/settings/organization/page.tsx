import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { PageHero, SectionPanel, StatusBadge } from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { humanizeEnum } from "@/lib/format";

export default async function OrganizationSettingsPage() {
  const { organization, membership } = await requireClientWorkspace();

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Workspace settings"
        title="Organization profile"
        body="Review the client organization, account status, and your current workspace role. Editable profile controls will appear here as client administration expands."
        metrics={[
          {
            label: "Account",
            value: humanizeEnum(organization.accountStatus),
            detail: "Workspace status",
          },
          {
            label: "Role",
            value: humanizeEnum(membership.role),
            detail: "Your permission level",
          },
          {
            label: "Primary contact",
            value: organization.primaryContactId ? "Assigned" : "Pending",
            detail: "Client contact status",
          },
        ]}
      />

      <SectionPanel
        title="Organization details"
        eyebrow="Client identity"
        aside={<StatusBadge tone="accent">Verified workspace</StatusBadge>}
      >
        <dl className="grid gap-4 text-sm md:grid-cols-3">
          <Detail
            icon={Building2}
            label="Organization"
            value={organization.name}
          />
          <Detail
            icon={UserRound}
            label="Your role"
            value={humanizeEnum(membership.role)}
          />
          <Detail
            icon={ShieldCheck}
            label="Account status"
            value={humanizeEnum(organization.accountStatus)}
          />
        </dl>
      </SectionPanel>
    </section>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-4">
      <Icon size={18} className="text-accent" aria-hidden />
      <dt className="mt-4 text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
