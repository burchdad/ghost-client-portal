import Link from "next/link";
import { StatusCard } from "@/components/status-card";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { getClientDashboardData } from "@/server/dashboard/service";

export default async function DashboardPage() {
  const { user, organization } = await requireOrganizationMembership();
  const data = await getClientDashboardData(organization.id, user.id);
  const firstName = user.name.split(" ")[0] || user.name;
  const activeProject = data.projects[0];

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-line bg-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-accent">Welcome back, {firstName}</p>
            <h1 className="mt-2 text-3xl font-semibold">{organization.name}</h1>
            <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-3">
              <p>Account status: {humanizeEnum(organization.accountStatus)}</p>
              <p>
                Ghost account lead:{" "}
                {activeProject?.projectOwner?.name ?? "Being assigned"}
              </p>
              <p>
                Notifications:{" "}
                {data.unreadNotificationCount
                  ? `${data.unreadNotificationCount} unread`
                  : "None unread"}
              </p>
            </div>
          </div>
          <Link
            href="/projects"
            className="rounded-md border border-line px-4 py-3 text-center text-sm"
          >
            View Projects
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatusCard
          label="Active projects"
          value={String(data.summary.activeProjects)}
          detail="Ghost is working on"
        />
        <StatusCard
          label="Open actions"
          value={String(data.summary.openActions)}
          detail="Needs attention"
        />
        <StatusCard
          label="Awaiting approval"
          value={String(data.summary.awaitingApproval)}
          detail="Client decisions"
        />
        <StatusCard
          label="Paid"
          value={formatMoney(data.summary.paidCents)}
          detail="Recorded payments"
        />
        <StatusCard
          label="Remaining"
          value={formatMoney(data.summary.remainingCents)}
          detail="Balance after payments"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-line bg-panel p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Action required</h2>
            <span className="text-sm text-muted">Sorted by urgency</span>
          </div>
          <div className="mt-4 space-y-3">
            {data.actions.length ? (
              data.actions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-md border border-line bg-white/[0.035] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{action.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {action.project.name}
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        {action.description}
                      </p>
                    </div>
                    <div className="text-sm text-muted sm:text-right">
                      <p>{humanizeEnum(action.priority)}</p>
                      <p>{formatDate(action.dueAt)}</p>
                    </div>
                  </div>
                  <Link
                    href={`/projects/${action.projectId}#actions`}
                    className="mt-4 inline-flex rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
                  >
                    Open Action
                  </Link>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-line p-5 text-sm text-muted">
                No actions are waiting on you right now.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Recent activity</h2>
          <div className="mt-4 space-y-3">
            {data.safeActivity.length ? (
              data.safeActivity.map((item) => (
                <div key={item.id} className="rounded-md bg-white/[0.04] p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.body ? (
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
                Client-safe activity will appear here as Ghost publishes
                progress.
              </p>
            )}
          </div>
        </div>
      </section>

      {activeProject ? (
        <section className="rounded-lg border border-line bg-panel p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-accent">
                {activeProject.serviceCategory}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {activeProject.name}
              </h2>
              <p className="mt-3 max-w-3xl text-sm text-muted">
                {activeProject.clientVisibleSummary}
              </p>
            </div>
            <Link
              href={`/projects/${activeProject.id}`}
              className="rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-slate-950"
            >
              Open Workspace
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Mini label="Current phase" value={activeProject.currentPhase} />
            <Mini
              label="Progress"
              value={`${activeProject.calculatedProgress}%`}
            />
            <Mini
              label="Next milestone"
              value={activeProject.nextMilestone?.name ?? "To be scheduled"}
            />
            <Mini
              label="Open actions"
              value={String(activeProject.openActionCount)}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">
          No active projects yet. When Ghost activates your first engagement,
          the project workspace will appear here.
        </section>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
