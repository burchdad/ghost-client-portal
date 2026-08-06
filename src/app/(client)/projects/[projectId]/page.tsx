import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  MessageSquare,
} from "lucide-react";
import {
  MetricCard,
  PageHero,
  ProgressBar,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireProjectAccess } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { getClientProjectWorkspace } from "@/server/projects/service";
import { submitApprovalDecisionAction } from "./actions";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [{ projectId }, message] = await Promise.all([params, searchParams]);
  const { organization } = await requireProjectAccess(projectId);
  const workspace = await getClientProjectWorkspace(projectId, organization.id);
  const { project } = workspace;
  const openActions = project.clientActions.filter(
    (action) => action.status !== "COMPLETED" && action.status !== "WAIVED",
  );
  const openApprovals = project.approvals.filter(
    (approval) => !approval.decidedAt,
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow={project.serviceCategory}
        title={project.name}
        body={project.clientVisibleSummary}
        actions={
          <>
            <Link
              href={`/messages?projectId=${project.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-3 text-sm font-semibold hover:border-accent"
            >
              <MessageSquare size={16} aria-hidden />
              Message Ghost
            </Link>
            {workspace.onboardingForms[0] ? (
              <Link
                href={`/projects/${project.id}/onboarding`}
                className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Continue Onboarding
              </Link>
            ) : null}
          </>
        }
        metrics={[
          {
            label: "Progress",
            value: `${workspace.calculatedProgress}%`,
            detail: humanizeEnum(project.status),
          },
          {
            label: "Open actions",
            value: String(openActions.length),
            detail: "Need attention",
          },
          {
            label: "Remaining",
            value: formatMoney(workspace.remainingCents),
            detail: "Project balance",
          },
        ]}
      />

      {message.error || message.notice ? (
        <p
          className={
            message.error
              ? "rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              : "rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent"
          }
        >
          {message.error ?? message.notice}
        </p>
      ) : null}

      <nav className="grid gap-2 text-sm md:grid-cols-4 xl:grid-cols-8">
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
            className="rounded-md border border-line px-3 py-2 text-center text-muted hover:border-accent hover:text-foreground"
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
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Amount paid"
          value={formatMoney(workspace.paidCents)}
          detail="Recorded against this project."
          tone="accent"
        />
        <MetricCard
          label="Approvals"
          value={String(openApprovals.length)}
          detail="Open review decisions."
          tone={openApprovals.length ? "warning" : "default"}
        />
        <MetricCard
          label="Files"
          value={String(project.files.length)}
          detail="Client-visible project assets."
        />
      </section>

      <SectionPanel title="Progress" eyebrow="Delivery state">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted">{project.currentPhase}</span>
          <span>{workspace.calculatedProgress}%</span>
        </div>
        <ProgressBar value={workspace.calculatedProgress} />
      </SectionPanel>

      <SectionPanel title="Timeline" eyebrow="Project phases">
        <div id="timeline" className="grid gap-3">
          {project.phases.length ? (
            project.phases.map((phase) => (
              <article
                key={phase.id}
                className="rounded-md border border-line bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{phase.name}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {phase.clientVisibleDescription ??
                        phase.description ??
                        "Client-visible details coming next."}
                    </p>
                  </div>
                  <StatusBadge>{humanizeEnum(phase.status)}</StatusBadge>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-3">
                  <p>Start: {formatDate(phase.startDate)}</p>
                  <p>Target: {formatDate(phase.targetDate)}</p>
                  <p>Completed: {formatDate(phase.completedDate)}</p>
                </div>
              </article>
            ))
          ) : (
            <EmptyLine text="Timeline phases have not been published yet." />
          )}
        </div>
      </SectionPanel>

      <SectionPanel title="Client actions" eyebrow="Needs attention">
        <div id="actions" className="space-y-3">
          {project.clientActions.length ? (
            project.clientActions.map((action) => (
              <article
                key={action.id}
                className="rounded-md border border-line bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        tone={
                          action.status === "COMPLETED" ? "accent" : "warning"
                        }
                      >
                        {humanizeEnum(action.status)}
                      </StatusBadge>
                      <StatusBadge>{humanizeEnum(action.priority)}</StatusBadge>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold">
                      {action.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {action.description}
                    </p>
                    {action.clientVisibleInstructions ? (
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {action.clientVisibleInstructions}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">
                    Due {formatDate(action.dueAt)}
                  </p>
                </div>
                {action.relatedOnboardingFormId ? (
                  <Link
                    href={`/projects/${project.id}/onboarding`}
                    className="mt-4 inline-flex rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
                  >
                    Open Onboarding
                  </Link>
                ) : null}
              </article>
            ))
          ) : (
            <EmptyLine text="No open client actions." />
          )}
        </div>
      </SectionPanel>

      <SectionPanel title="Onboarding" eyebrow="Client intake">
        <div
          id="onboarding"
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm text-muted">
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
      </SectionPanel>

      <SectionPanel title="Files" eyebrow="Client-visible assets">
        <div id="files" className="grid gap-3">
          {project.files.length ? (
            project.files.map((file) => (
              <article
                key={file.id}
                className="flex flex-col gap-4 rounded-md border border-line bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <FileText
                    className="mt-1 text-accent"
                    size={18}
                    aria-hidden
                  />
                  <div>
                    <h2 className="font-semibold">{file.name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {humanizeEnum(file.category)} -{" "}
                      {formatDate(file.createdAt)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/requests?type=file"
                  className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm hover:border-accent"
                >
                  <Download size={15} aria-hidden />
                  Request access
                </Link>
              </article>
            ))
          ) : (
            <EmptyLine text="No project files have been published yet." />
          )}
        </div>
      </SectionPanel>

      <SectionPanel title="Deliverables" eyebrow="Review queue">
        <div id="deliverables" className="grid gap-3">
          {project.deliverables.length ? (
            project.deliverables.map((deliverable) => (
              <article
                key={deliverable.id}
                className="rounded-md border border-line bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <StatusBadge>
                      {humanizeEnum(deliverable.status)}
                    </StatusBadge>
                    <h2 className="mt-3 text-xl font-semibold">
                      {deliverable.name}
                    </h2>
                    {deliverable.description ? (
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {deliverable.description}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">
                    {deliverable.versions[0]
                      ? `Latest ${deliverable.versions[0].version}`
                      : "No version yet"}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <EmptyLine text="Deliverables will appear when Ghost publishes them." />
          )}
        </div>
      </SectionPanel>

      <SectionPanel title="Approvals" eyebrow="Decision records">
        <div id="approvals" className="space-y-4">
          {project.approvals.length ? (
            project.approvals.map((approval) => (
              <article
                key={approval.id}
                className="rounded-md border border-line bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        tone={approval.decidedAt ? "accent" : "warning"}
                      >
                        {approval.decidedAt ? "Decided" : "Needs decision"}
                      </StatusBadge>
                      {approval.decision ? (
                        <StatusBadge>
                          {humanizeEnum(approval.decision)}
                        </StatusBadge>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold">
                      {approval.deliverable?.name ?? "Project approval"}
                    </h2>
                    {approval.feedback ? (
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {approval.feedback}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-muted">
                      Requested {formatDate(approval.createdAt)}
                    </p>
                  </div>
                  {approval.decidedAt ? (
                    <div className="inline-flex items-center gap-2 text-sm text-accent">
                      <CheckCircle2 size={16} aria-hidden />
                      {formatDate(approval.decidedAt)}
                    </div>
                  ) : (
                    <ApprovalDecisionForm
                      projectId={project.id}
                      approvalId={approval.id}
                    />
                  )}
                </div>
              </article>
            ))
          ) : (
            <EmptyLine text="Approval requests will appear when Ghost publishes them." />
          )}
        </div>
      </SectionPanel>

      <SectionPanel title="Payments" eyebrow="Project ledger">
        <div id="payments" className="space-y-3">
          {project.payments.length ? (
            project.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-3 rounded-md border border-line bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {humanizeEnum(payment.paymentType)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {humanizeEnum(payment.status)} -{" "}
                    {formatDate(payment.createdAt)}
                  </p>
                </div>
                <p className="text-xl font-semibold">
                  {formatMoney(payment.amountCents, payment.currency)}
                </p>
              </div>
            ))
          ) : (
            <EmptyLine text="No project payments are recorded yet." />
          )}
        </div>
      </SectionPanel>

      <SectionPanel title="Activity" eyebrow="Client-safe updates">
        <div id="activity" className="space-y-3">
          {workspace.safeActivity.length ? (
            workspace.safeActivity.map((item) => (
              <article
                key={item.id}
                className="rounded-md bg-white/[0.035] p-3"
              >
                <p className="text-sm font-medium">{item.title}</p>
                {item.body ? (
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted">
                  {formatDate(item.createdAt)}
                </p>
              </article>
            ))
          ) : (
            <EmptyLine text="No client-visible activity yet." />
          )}
        </div>
      </SectionPanel>
    </section>
  );
}

function ApprovalDecisionForm({
  projectId,
  approvalId,
}: {
  projectId: string;
  approvalId: string;
}) {
  return (
    <form
      action={submitApprovalDecisionAction}
      className="w-full space-y-3 lg:max-w-md"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="approvalId" value={approvalId} />
      <label
        className="block text-sm text-muted"
        htmlFor={`decision-${approvalId}`}
      >
        Decision
      </label>
      <select
        id={`decision-${approvalId}`}
        name="decision"
        className="w-full rounded-md border border-line bg-background px-3 py-3 text-sm"
        defaultValue="APPROVED"
      >
        <option value="APPROVED">Approve</option>
        <option value="APPROVED_WITH_MINOR_CHANGES">
          Approve with minor changes
        </option>
        <option value="REVISIONS_REQUESTED">Request revisions</option>
        <option value="REJECTED">Reject</option>
      </select>
      <label
        className="block text-sm text-muted"
        htmlFor={`feedback-${approvalId}`}
      >
        Feedback
      </label>
      <textarea
        id={`feedback-${approvalId}`}
        name="feedback"
        maxLength={2000}
        placeholder="Optional notes for Ghost."
        className="min-h-24 w-full rounded-md border border-line bg-background px-3 py-3 text-sm"
      />
      <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
        <Clock3 size={16} aria-hidden />
        Submit decision
      </button>
    </form>
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

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
      {text}
    </p>
  );
}
