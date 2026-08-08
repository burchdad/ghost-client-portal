import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Compass,
  FolderKanban,
  Megaphone,
  MessageSquareText,
  Sparkles,
  WalletCards,
} from "lucide-react";
import {
  MetricCard,
  PageHero,
  ProgressBar,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { getClientDashboardData } from "@/server/dashboard/service";

export default async function DashboardPage() {
  const { user, organization } = await requireClientWorkspace();
  const data = await getClientDashboardData(organization.id, user.id);
  const firstName = user.name.split(" ")[0] || user.name;
  const activeProject = data.projects[0];
  const hasWork =
    data.summary.activeProjects > 0 ||
    data.summary.openActions > 0 ||
    data.safeActivity.length > 0;
  const ghostLead = activeProject?.projectOwner?.name ?? "Being assigned";
  const primaryAction = data.actions[0];
  const checklist = [
    {
      label: "Account access",
      done: organization.accountStatus === "ACTIVE",
      href: "/settings/security",
    },
    {
      label: "Approvals",
      done: data.summary.awaitingApproval === 0,
      href: "/proposals",
    },
    {
      label: "Open actions",
      done: data.summary.openActions === 0,
      href: activeProject
        ? `/projects/${activeProject.id}#actions`
        : "/projects",
    },
    {
      label: "Alerts",
      done: true,
      href: "/settings",
    },
    {
      label: "Support",
      done: true,
      href: "/requests",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Client workspace"
        title={`${organization.name} dashboard`}
        body={
          hasWork
            ? `Welcome back, ${firstName}. Review what needs attention, check project progress, and jump into Vega, GEO, Echo, or payments from one place.`
            : `Welcome back, ${firstName}. Your portal is ready. Projects, approvals, payment items, and Ghost AI signals will appear here as they are published.`
        }
        actions={
          <>
            <Link
              href="/vega"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Run Vega search
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
            label: "Workspace",
            value: displayEnum(organization.accountStatus),
            detail: "Portal status",
          },
          {
            label: "Ghost lead",
            value: ghostLead,
            detail: "Account support",
          },
          {
            label: "Alerts",
            value: String(data.unreadNotificationCount),
            detail: "Unread",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard
          label="Active projects"
          value={String(data.summary.activeProjects)}
          detail="Published workspaces"
          tone="accent"
        />
        <MetricCard
          label="Open actions"
          value={String(data.summary.openActions)}
          detail="Need attention"
        />
        <MetricCard
          label="Awaiting approval"
          value={String(data.summary.awaitingApproval)}
          detail="Client decisions"
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

      <section className="grid items-start gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionPanel
          title={primaryAction ? "Next action" : "All clear"}
          eyebrow="Priority queue"
          aside={
            <span className="text-sm text-muted">
              {primaryAction ? "Sorted by urgency" : "Nothing due"}
            </span>
          }
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
              <div className="rounded-md border border-line bg-white/[0.035] p-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
                    <CheckCircle2 size={20} aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      No client action is due
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                      You are caught up. When Ghost needs an approval,
                      questionnaire, payment review, or decision, it will appear
                      here with a clear next step.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                      <span className="rounded-md border border-line px-3 py-2">
                        Monitoring workspace
                      </span>
                      <span className="rounded-md border border-line px-3 py-2">
                        Alerts enabled
                      </span>
                      <span className="rounded-md border border-line px-3 py-2">
                        No deadline today
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SectionPanel>

        <div className="space-y-5">
          <SectionPanel title="Workspace readiness" eyebrow="Setup">
            <div className="space-y-3">
              {checklist.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between gap-4 rounded-md border border-line bg-white/[0.035] p-4 transition hover:border-accent"
                >
                  <span className="flex items-center gap-3">
                    <CheckCircle2
                      size={18}
                      className={item.done ? "text-accent" : "text-muted"}
                      aria-hidden
                    />
                    <span className="font-semibold">{item.label}</span>
                  </span>
                  <StatusBadge tone={item.done ? "accent" : "warning"}>
                    {item.done ? "Ready" : "Review"}
                  </StatusBadge>
                </Link>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Ghost AI modules" eyebrow="Tools">
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
                body="Search visibility, AI answer readiness, competitors, and gaps."
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
                body="Balances, checkout status, payment history, and billing notes."
                status={data.summary.amountDueCents ? "Due" : "Clear"}
              />
            </div>
          </SectionPanel>
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1fr_0.8fr]">
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
          <SectionPanel title="Projects" eyebrow="Delivery">
            <div className="rounded-md border border-dashed border-line p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
                  <FolderKanban size={20} aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    No project is published yet
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                    Once Ghost opens your first engagement, this area will show
                    milestones, files, approvals, actions, and delivery
                    progress.
                  </p>
                </div>
              </div>
            </div>
          </SectionPanel>
        )}

        <SectionPanel title="Recent activity" eyebrow="Updates">
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
                Updates will appear here when Ghost publishes client-visible
                progress.
              </p>
            )}
          </div>
        </SectionPanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/requests"
          className="rounded-lg border border-line bg-panel p-5 transition hover:border-accent"
        >
          <MessageSquareText size={20} className="text-accent" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold">Ask Ghost</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Send a request and keep the follow-up tied to this workspace.
          </p>
        </Link>
        <Link
          href="/settings"
          className="rounded-lg border border-line bg-panel p-5 transition hover:border-accent"
        >
          <BellRing size={20} className="text-accent" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold">Notification settings</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Choose which project, proposal, Vega, GEO, Echo, request, and
            payment updates you receive.
          </p>
        </Link>
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

function displayEnum(value: string) {
  return humanizeEnum(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}
