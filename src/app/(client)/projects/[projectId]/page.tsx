import Link from "next/link";
import { requireProjectAccess } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { getClientProjectWorkspace } from "@/server/projects/service";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { organization } = await requireProjectAccess(projectId);
  const workspace = await getClientProjectWorkspace(projectId, organization.id);
  const { project } = workspace;

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-accent">{project.organization.name}</p>
            <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-muted">
              {project.clientVisibleSummary}
            </p>
          </div>
          <div className="rounded-md border border-line px-4 py-3 text-sm text-muted">
            {humanizeEnum(project.status)} · {workspace.calculatedProgress}%
          </div>
        </div>
        <div className="mt-6 h-2 rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-accent"
            style={{ width: `${workspace.calculatedProgress}%` }}
          />
        </div>
      </div>

      <nav className="grid gap-2 text-sm md:grid-cols-8">
        {[
          "Overview",
          "Timeline",
          "Actions",
          "Onboarding",
          "Files",
          "Deliverables",
          "Approvals",
          "Payments",
        ].map((tab) => (
          <a
            key={tab}
            href={`#${tab.toLowerCase()}`}
            className="rounded-md border border-line px-3 py-2 text-center text-muted hover:text-foreground"
          >
            {tab}
          </a>
        ))}
      </nav>

      <section id="overview" className="grid gap-4 md:grid-cols-4">
        <Info label="Current phase" value={project.currentPhase} />
        <Info
          label="Next milestone"
          value={workspace.nextMilestone?.name ?? "To be scheduled"}
        />
        <Info
          label="Target date"
          value={formatDate(project.targetCompletionDate)}
        />
        <Info
          label="Ghost lead"
          value={project.projectOwner?.name ?? "Being assigned"}
        />
        <Info label="Amount paid" value={formatMoney(workspace.paidCents)} />
        <Info
          label="Remaining balance"
          value={formatMoney(workspace.remainingCents)}
        />
        <Info
          label="Open actions"
          value={String(
            project.clientActions.filter(
              (action) =>
                action.status !== "COMPLETED" && action.status !== "WAIVED",
            ).length,
          )}
        />
        <Info label="Service" value={project.serviceCategory} />
      </section>

      <section
        id="timeline"
        className="rounded-lg border border-line bg-panel p-5"
      >
        <h2 className="text-xl font-semibold">Timeline</h2>
        <div className="mt-4 grid gap-3">
          {project.phases.map((phase) => (
            <div
              key={phase.id}
              className="rounded-md border border-line bg-white/[0.035] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{phase.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {phase.clientVisibleDescription ??
                      phase.description ??
                      "Client-visible details coming next."}
                  </p>
                </div>
                <span className="text-sm text-muted">{phase.status}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-3">
                <p>Start: {formatDate(phase.startDate)}</p>
                <p>Target: {formatDate(phase.targetDate)}</p>
                <p>Completed: {formatDate(phase.completedDate)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="actions"
        className="rounded-lg border border-line bg-panel p-5"
      >
        <h2 className="text-xl font-semibold">Client Actions</h2>
        <div className="mt-4 space-y-3">
          {project.clientActions.length ? (
            project.clientActions.map((action) => (
              <div
                key={action.id}
                className="rounded-md border border-line bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{action.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {action.description}
                    </p>
                    {action.clientVisibleInstructions ? (
                      <p className="mt-2 text-sm text-muted">
                        {action.clientVisibleInstructions}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted sm:text-right">
                    <p>{humanizeEnum(action.status)}</p>
                    <p>{formatDate(action.dueAt)}</p>
                  </div>
                </div>
                {action.relatedOnboardingFormId ? (
                  <Link
                    href={`/projects/${project.id}/onboarding`}
                    className="mt-4 inline-flex rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
                  >
                    Open Onboarding
                  </Link>
                ) : null}
              </div>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
              No open client actions.
            </p>
          )}
        </div>
      </section>

      <section
        id="onboarding"
        className="rounded-lg border border-line bg-panel p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Onboarding</h2>
            <p className="mt-2 text-sm text-muted">
              {workspace.onboardingForms[0]
                ? `${workspace.onboardingForms[0].completionPercentage}% complete`
                : "Onboarding has not been prepared yet."}
            </p>
          </div>
          {workspace.onboardingForms[0] ? (
            <Link
              href={`/projects/${project.id}/onboarding`}
              className="rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-slate-950"
            >
              Continue Onboarding
            </Link>
          ) : null}
        </div>
      </section>

      <section
        id="files"
        className="rounded-lg border border-line bg-panel p-5"
      >
        <h2 className="text-xl font-semibold">Files</h2>
        <p className="mt-3 text-sm text-muted">
          Client-visible project files will appear here after Ghost publishes or
          receives them.
        </p>
      </section>

      <section
        id="deliverables"
        className="rounded-lg border border-line bg-panel p-5"
      >
        <h2 className="text-xl font-semibold">Deliverables</h2>
        <p className="mt-3 text-sm text-muted">
          Deliverable review arrives in a later phase.
        </p>
      </section>

      <section
        id="approvals"
        className="rounded-lg border border-line bg-panel p-5"
      >
        <h2 className="text-xl font-semibold">Approvals</h2>
        <p className="mt-3 text-sm text-muted">
          Approval requests will appear here when Ghost publishes them.
        </p>
      </section>

      <section
        id="payments"
        className="rounded-lg border border-line bg-panel p-5"
      >
        <h2 className="text-xl font-semibold">Payments</h2>
        <div className="mt-4 space-y-3">
          {project.payments.length ? (
            project.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex justify-between gap-4 rounded-md bg-white/[0.035] p-3 text-sm"
              >
                <span>{humanizeEnum(payment.paymentType)}</span>
                <span>
                  {formatMoney(payment.amountCents, payment.currency)} ·{" "}
                  {humanizeEnum(payment.status)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">
              No project payments are recorded yet.
            </p>
          )}
        </div>
      </section>

      <section
        id="activity"
        className="rounded-lg border border-line bg-panel p-5"
      >
        <h2 className="text-xl font-semibold">Activity</h2>
        <div className="mt-4 space-y-3">
          {workspace.safeActivity.length ? (
            workspace.safeActivity.map((item) => (
              <div key={item.id} className="rounded-md bg-white/[0.035] p-3">
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
            <p className="text-sm text-muted">
              No client-visible activity yet.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
