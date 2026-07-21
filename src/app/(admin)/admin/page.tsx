import { StatusCard } from "@/components/status-card";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function AdminPage() {
  await requireInternalRole();
  const db = getDb();
  const [
    organizations,
    proposals,
    projects,
    auditEvents,
    paymentsAwaitingConfirmation,
    projectsAwaitingActivation,
    clientsAwaitingInvitation,
    onboardingAwaitingClient,
    overdueActions,
    recoveryRequiredPayments,
  ] = await Promise.all([
    db.organization.count(),
    db.proposal.count(),
    db.project.count(),
    db.auditLog.count(),
    db.payment.count({
      where: { status: { in: ["CHECKOUT_CREATED", "PROCESSING"] } },
    }),
    db.payment.count({ where: { status: "PAID", projectId: null } }),
    db.organization.count({
      where: {
        memberships: { none: { deletedAt: null } },
      },
    }),
    db.onboardingForm.count({ where: { submittedAt: null } }),
    db.clientAction.count({
      where: {
        dueAt: { lt: new Date() },
        status: { in: ["PENDING", "IN_PROGRESS", "NEEDS_CHANGES"] },
      },
    }),
    db.payment.count({ where: { recoveryRequired: true } }),
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-accent">Portal-specific administration</p>
        <h1 className="text-3xl font-semibold">Client-facing records</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard
          label="Organizations"
          value={String(organizations)}
          detail="Portal tenants"
        />
        <StatusCard
          label="Proposals"
          value={String(proposals)}
          detail="Client-visible proposals"
        />
        <StatusCard
          label="Projects"
          value={String(projects)}
          detail="Portal-visible projects"
        />
        <StatusCard
          label="Audit events"
          value={String(auditEvents)}
          detail="Immutable security trail"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard
          label="Payments awaiting confirmation"
          value={String(paymentsAwaitingConfirmation)}
          detail="Checkout created or processing"
        />
        <StatusCard
          label="Projects awaiting activation"
          value={String(projectsAwaitingActivation)}
          detail="Paid but fulfillment pending"
        />
        <StatusCard
          label="Clients awaiting invitation"
          value={String(clientsAwaitingInvitation)}
          detail="No active membership"
        />
        <StatusCard
          label="Onboarding awaiting client"
          value={String(onboardingAwaitingClient)}
          detail="Draft or not submitted"
        />
        <StatusCard
          label="Client actions overdue"
          value={String(overdueActions)}
          detail="Needs follow-up"
        />
        <StatusCard
          label="Recovery-required payments"
          value={String(recoveryRequiredPayments)}
          detail="Needs internal review"
        />
      </div>
    </section>
  );
}
