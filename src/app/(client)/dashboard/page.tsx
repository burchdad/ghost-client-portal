import { StatusCard } from "@/components/status-card";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function DashboardPage() {
  const { user, organization } = await requireOrganizationMembership();
  const db = getDb();
  const [projects, requests, approvals, payments, activity] = await Promise.all([
    db.project.findMany({ where: { organizationId: organization.id, deletedAt: null } }),
    db.supportRequest.findMany({ where: { organizationId: organization.id } }),
    db.approval.findMany({
      where: { project: { organizationId: organization.id }, decision: null },
      take: 5,
    }),
    db.payment.findMany({ where: { organizationId: organization.id } }),
    db.activityEvent.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const amountDue = payments
    .filter((payment) => payment.status !== "PAID")
    .reduce((total, payment) => total + payment.amountCents, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm text-accent">Welcome back, {user.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">{organization.name}</h1>
        <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-3">
          <p>Account status: {organization.accountStatus.toLowerCase()}</p>
          <p>Last login: {user.lastLoginAt ? user.lastLoginAt.toLocaleString() : "First login"}</p>
          <p>Ghost account lead: assigned in Phase 2</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Active projects" value={String(projects.length)} detail="Client-visible workspaces" />
        <StatusCard label="Open requests" value={String(requests.length)} detail="Support and service requests" />
        <StatusCard label="Amount due" value={`$${(amountDue / 100).toLocaleString()}`} detail="Trusted server-side totals" />
        <StatusCard label="Needs approval" value={String(approvals.length)} detail="Awaiting client decision" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Action required</h2>
          <div className="mt-4 rounded-md border border-dashed border-line p-5 text-sm text-muted">
            No urgent client actions are open yet. Seeded onboarding actions appear after project activation.
          </div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <div className="mt-4 space-y-3">
            {activity.length ? (
              activity.map((item) => (
                <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted">{item.type}</p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
                Client-safe activity will appear here.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
