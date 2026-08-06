import { KeyRound, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import { PageHero, SectionPanel, StatusBadge } from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function SecuritySettingsPage() {
  const { user, organization } = await requireOrganizationMembership();
  const activeSessions = await getDb().session.count({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Security"
        title={`Access protection for ${organization.name}`}
        body="Review password status, active sessions, and MFA readiness for this client workspace."
        metrics={[
          {
            label: "Password",
            value: "Active",
            detail: "Reset links expire in 30 minutes",
          },
          {
            label: "Sessions",
            value: String(activeSessions),
            detail: "Active portal sessions",
          },
          {
            label: "MFA",
            value: "Ready",
            detail: "Enrollment controls staged",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <SecurityCard
          icon={KeyRound}
          title="Password reset"
          status="Live"
          body="Secure reset links are signed, expire quickly, and become invalid after the password changes."
        />
        <SecurityCard
          icon={LockKeyhole}
          title="Session protection"
          status="Live"
          body="Portal sessions are HTTP-only, same-site cookies and are revoked when passwords are reset."
        />
        <SecurityCard
          icon={Smartphone}
          title="Multi-factor access"
          status="Staged"
          body="MFA enrollment is positioned here for the next auth hardening pass."
        />
      </section>

      <SectionPanel
        title="Current account"
        eyebrow="Access review"
        aside={<StatusBadge tone="accent">Protected workspace</StatusBadge>}
      >
        <dl className="grid gap-4 text-sm md:grid-cols-3">
          <Detail label="Signed in as" value={user.email} />
          <Detail label="Last login" value={formatDate(user.lastLoginAt)} />
          <Detail label="Workspace" value={organization.name} />
        </dl>
      </SectionPanel>
    </section>
  );
}

function SecurityCard({
  icon: Icon,
  title,
  status,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  status: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
          <Icon size={18} aria-hidden />
        </div>
        <StatusBadge tone={status === "Live" ? "accent" : "warning"}>
          {status}
        </StatusBadge>
      </div>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-4">
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value}</dd>
    </div>
  );
}
