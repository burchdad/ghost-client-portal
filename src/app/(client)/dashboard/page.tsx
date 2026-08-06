import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FolderKanban,
  Megaphone,
  Sparkles,
  WalletCards,
} from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  ProgressBar,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { getClientDashboardData } from "@/server/dashboard/service";

export default async function DashboardPage() {
  const { user, organization } = await requireOrganizationMembership();
  const data = await getClientDashboardData(organization.id, user.id);
  const firstName = user.name.split(" ")[0] || user.name;
  const activeProject = data.projects[0];
  const hasWork =
    data.summary.activeProjects > 0 ||
    data.summary.openActions > 0 ||
    data.safeActivity.length > 0;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Workspace command"
        title={`${organization.name} growth cockpit`}
        body={
          hasWork
            ? `Welcome back, ${firstName}. Your workspace is active across client work, lead generation, visibility, and campaign planning.`
            : `Welcome back, ${firstName}. Your workspace is ready; Ghost will publish projects, proposals, payments, and operating signals here as they activate.`
        }
        actions={
          <>
            <Link
              href="/vega"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Open Vega
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-3 text-sm hover:border-accent"
            >
              View projects
            </Link>
          </>
        }
        metrics={[
          {
            label: "Status",
            value: humanizeEnum(organization.accountStatus),
            detail: "Client workspace",
          },
          {
            label: "Lead",
            value: activeProject?.projectOwner?.name ?? "Pending",
            detail: "Ghost account owner",
          },
          {
            label: "Unread",
            value: String(data.unreadNotificationCount),
            detail: "Notifications",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard
          label="Active projects"
          value={String(data.summary.activeProjects)}
          detail="Client-visible workspaces"
          tone="accent"
        />
        <MetricCard
          label="Open actions"
          value={String(data.summary.openActions)}
          detail="Items waiting on a client or Ghost decision"
        />
        <MetricCard
          label="Awaiting approval"
          value={String(data.summary.awaitingApproval)}
          detail="Decision checkpoints"
        />
        <MetricCard
          label="Paid"
          value={formatMoney(data.summary.paidCents)}
          detail="Recorded payments"
        />
        <MetricCard
          label="Due now"
          value={formatMoney(data.summary.amountDueCents)}
          detail="Open payment obligations"
          tone={data.summary.amountDueCents ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionPanel
          title="Next best action"
          eyebrow="Priority queue"
          aside={<span className="text-sm text-muted">Sorted by urgency</span>}
        >
          <div className="space-y-3">
            {data.actions.length ? (
              data.actions.map((action) => (
                <div
                  key={action.id}
                  className="rounded-md border border-line bg-white/[0.035] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <StatusBadge
                        tone={
                          action.priority === "HIGH" ? "warning" : "default"
                        }
                      >
                        {humanizeEnum(action.priority)}
                      </StatusBadge>
                      <p className="mt-3 font-semibold">{action.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {action.project.name}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {action.description}
                      </p>
                    </div>
                    <p className="text-sm text-muted sm:text-right">
                      {formatDate(action.dueAt)}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${action.projectId}#actions`}
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
                  >
                    Open action
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                </div>
              ))
            ) : (
              <EmptyWorkspace
                icon={CheckCircle2}
                title="No action is waiting on you"
                body="The client queue is clear. Ghost will surface approvals, questionnaires, payment reviews, and launch decisions here when they need attention."
                steps={[
                  "Workspace monitored",
                  "Notifications enabled",
                  "Next action will appear here",
                ]}
              />
            )}
          </div>
        </SectionPanel>

        <SectionPanel title="Operating modules" eyebrow="Ghost AI system">
          <div className="grid gap-3 md:grid-cols-2">
            <ModuleCard
              icon={Sparkles}
              title="Vega"
              href="/vega"
              body="Lead sourcing, lists, enrichment, and outreach readiness."
              status="Live"
            />
            <ModuleCard
              icon={Compass}
              title="GEO"
              href="/geo"
              body="SEO, AEO, GEO positioning, competitors, and visibility gaps."
              status="Tracking"
            />
            <ModuleCard
              icon={Megaphone}
              title="Echo"
              href="/echo"
              body="Marketing tactics, campaign moves, and content plays."
              status="Planning"
            />
            <ModuleCard
              icon={WalletCards}
              title="Payments"
              href="/payments"
              body="Balances, checkout state, history, and billing readiness."
              status={data.summary.amountDueCents ? "Due" : "Clear"}
            />
          </div>
        </SectionPanel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        {activeProject ? (
          <SectionPanel
            title={activeProject.name}
            eyebrow={activeProject.serviceCategory}
            aside={
              <Link
                href={`/projects/${activeProject.id}`}
                className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Open workspace
              </Link>
            }
          >
            <p className="text-sm leading-6 text-muted">
              {activeProject.clientVisibleSummary}
            </p>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted">Progress</span>
                <span>{activeProject.calculatedProgress}%</span>
              </div>
              <ProgressBar value={activeProject.calculatedProgress} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <Mini label="Phase" value={activeProject.currentPhase} />
              <Mini
                label="Milestone"
                value={activeProject.nextMilestone?.name ?? "To be scheduled"}
              />
              <Mini
                label="Open actions"
                value={String(activeProject.openActionCount)}
              />
              <Mini
                label="Remaining"
                value={formatMoney(activeProject.remainingCents)}
              />
            </div>
          </SectionPanel>
        ) : (
          <EmptyWorkspace
            icon={FolderKanban}
            title="No active project is visible yet"
            body="When Ghost activates the first engagement, the project workspace will show phases, milestones, files, requests, actions, and delivery progress."
            steps={[
              "Proposal or kickoff starts the workspace",
              "Milestones publish here",
              "Client actions stay organized",
            ]}
          />
        )}

        <SectionPanel title="Recent activity" eyebrow="Client-safe log">
          <div className="space-y-3">
            {data.safeActivity.length ? (
              data.safeActivity.map((item) => (
                <div key={item.id} className="rounded-md bg-white/[0.04] p-4">
                  <p className="font-semibold">{item.title}</p>
                  {item.body ? (
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {item.body}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted">
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
        </SectionPanel>
      </section>
    </div>
  );
}

function ModuleCard({
  icon: Icon,
  title,
  body,
  href,
  status,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  status: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-line bg-black/10 p-4 transition hover:border-accent hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
          <Icon size={18} aria-hidden />
        </div>
        <StatusBadge tone={status === "Due" ? "warning" : "accent"}>
          {status}
        </StatusBadge>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
