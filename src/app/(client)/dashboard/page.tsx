import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Compass,
  FolderKanban,
  LifeBuoy,
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
  const primaryAction = data.actions[0];
  const ghostLead = activeProject?.projectOwner?.name ?? "Being assigned";
  const totalClientSignals =
    data.summary.activeProjects +
    data.summary.openActions +
    data.summary.awaitingApproval +
    data.safeActivity.length;
  const hasWork = totalClientSignals > 0;
  const readinessItems = [
    {
      label: "Account access",
      done: organization.accountStatus === "ACTIVE",
      href: "/settings/security",
    },
    {
      label: "Approvals",
      done: data.summary.awaitingApproval === 0,
      href: activeProject ? `/projects/${activeProject.id}#approvals` : "/geo",
    },
    {
      label: "Open actions",
      done: data.summary.openActions === 0,
      href: activeProject
        ? `/projects/${activeProject.id}#actions`
        : "/projects",
    },
    {
      label: "Billing",
      done: data.summary.amountDueCents === 0,
      href: "/payments",
    },
  ];
  const systemModules = [
    {
      icon: Sparkles,
      title: "Vega",
      href: "/vega",
      body: "Pull leads, review prospects, build lists, and prepare outreach.",
      status: "LeadGen",
      tone: "accent" as const,
    },
    {
      icon: Compass,
      title: "GEO",
      href: "/geo",
      body: "Track SEO, AEO, GEO visibility, competitors, and approvals.",
      status: "Visibility",
      tone: "signal" as const,
    },
    {
      icon: Megaphone,
      title: "Echo",
      href: "/echo",
      body: "Turn market signals into campaign tactics and content moves.",
      status: "Marketing",
      tone: "default" as const,
    },
    {
      icon: WalletCards,
      title: "Payments",
      href: "/payments",
      body: "Review balances, payment schedules, checkout status, and receipts.",
      status: data.summary.amountDueCents ? "Due" : "Clear",
      tone: data.summary.amountDueCents
        ? ("warning" as const)
        : ("default" as const),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Ghost Command Center"
        title={`${organization.name} workspace`}
        body={
          hasWork
            ? `Welcome back, ${firstName}. This is the client-safe view of what Ghost is building, what needs approval, what is due, and where your growth systems stand.`
            : `Welcome back, ${firstName}. Your workspace is ready. Ghost will publish projects, approvals, lead generation, visibility, and billing updates here as they become client-visible.`
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
              href="/requests"
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-3 text-sm hover:border-accent"
            >
              Ask Ghost
              <MessageSquareText size={16} aria-hidden />
            </Link>
          </>
        }
        metrics={[
          {
            label: "Status",
            value: displayEnum(organization.accountStatus),
            detail: "Client workspace",
          },
          {
            label: "Ghost lead",
            value: ghostLead,
            detail: "Account support",
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
          label="Projects"
          value={String(data.summary.activeProjects)}
          detail="Client-visible workspaces"
          tone={data.summary.activeProjects ? "accent" : "default"}
        />
        <MetricCard
          label="Open actions"
          value={String(data.summary.openActions)}
          detail="Items waiting on a decision or follow-up."
          tone={data.summary.openActions ? "warning" : "default"}
        />
        <MetricCard
          label="Approvals"
          value={String(data.summary.awaitingApproval)}
          detail="Decision checkpoints ready for review."
          tone={data.summary.awaitingApproval ? "warning" : "default"}
        />
        <MetricCard
          label="Paid"
          value={formatMoney(data.summary.paidCents)}
          detail="Recorded payments."
        />
        <MetricCard
          label="Due now"
          value={formatMoney(data.summary.amountDueCents)}
          detail="Open payment obligations."
          tone={data.summary.amountDueCents ? "warning" : "default"}
        />
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionPanel
          title={primaryAction ? "Next best action" : "You are caught up"}
          eyebrow="Priority queue"
          aside={
            <span className="text-sm text-muted">
              {primaryAction ? "Sorted by urgency" : "No client action due"}
            </span>
          }
        >
          {data.actions.length ? (
            <div className="grid gap-3">
              {data.actions.map((action) => (
                <article
                  key={action.id}
                  className="rounded-md border border-line bg-white/[0.035] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          tone={
                            action.priority === "HIGH" ? "warning" : "default"
                          }
                        >
                          {humanizeEnum(action.priority)}
                        </StatusBadge>
                        <StatusBadge>{action.project.name}</StatusBadge>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold">
                        {action.title}
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
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
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-line bg-white/[0.035] p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
                  <CheckCircle2 size={20} aria-hidden />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    No action is waiting on you
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    Ghost will surface approvals, questionnaires, payment
                    reviews, and launch decisions here when your input is
                    needed.
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3">
                    <span className="rounded-md border border-line px-3 py-2">
                      Workspace monitored
                    </span>
                    <span className="rounded-md border border-line px-3 py-2">
                      Alerts active
                    </span>
                    <span className="rounded-md border border-line px-3 py-2">
                      No deadline today
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SectionPanel>

        <SectionPanel title="Client launch checklist" eyebrow="Readiness">
          <div className="space-y-3">
            {readinessItems.map((item) => (
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
                  {item.done ? "Ready" : "Needs review"}
                </StatusBadge>
              </Link>
            ))}
          </div>
        </SectionPanel>
      </section>

      <SectionPanel title="Ghost systems" eyebrow="Client-safe outputs">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {systemModules.map((module) => (
            <ModuleCard key={module.title} {...module} />
          ))}
        </div>
      </SectionPanel>

      <section className="grid items-start gap-5 xl:grid-cols-[1fr_0.8fr]">
        {activeProject ? (
          <SectionPanel
            title={activeProject.name}
            eyebrow={activeProject.serviceCategory}
            aside={
              <Link
                href={`/projects/${activeProject.id}`}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Open workspace
                <ArrowRight size={16} aria-hidden />
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
                label="Next milestone"
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
          <SectionPanel title="Project workspace" eyebrow="Delivery">
            <EmptyState
              icon={FolderKanban}
              title="No active project is visible yet"
              body="When Ghost activates an engagement, project workspaces will show phases, milestones, files, requests, actions, and delivery progress."
              chips={[
                "Proposal or kickoff starts the workspace",
                "Milestones publish here",
                "Client actions stay organized",
              ]}
            />
          </SectionPanel>
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

      <section className="grid gap-4 md:grid-cols-3">
        <ActionTile
          icon={MessageSquareText}
          title="Ask Ghost"
          body="Submit a question or service request and keep the follow-up attached to this workspace."
          href="/requests"
        />
        <ActionTile
          icon={BellRing}
          title="Tune alerts"
          body="Choose which project, proposal, Vega, GEO, Echo, request, and payment updates reach you."
          href="/settings"
        />
        <ActionTile
          icon={LifeBuoy}
          title="Need help?"
          body="Use the request desk instead of losing important asks in email or text threads."
          href="/requests"
        />
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
  tone,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  status: string;
  tone: "default" | "accent" | "signal" | "warning";
}) {
  const statusTone =
    tone === "warning" ? "warning" : tone === "accent" ? "accent" : "default";

  return (
    <Link
      href={href}
      className="group rounded-md border border-line bg-black/10 p-4 transition hover:border-accent hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
          <Icon size={18} aria-hidden />
        </div>
        <StatusBadge tone={statusTone}>{status}</StatusBadge>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 min-h-16 text-sm leading-6 text-muted">{body}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm text-accent">
        Open {title}
        <ArrowRight
          size={15}
          className="transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}

function ActionTile({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-line bg-panel p-5 transition hover:border-accent"
    >
      <Icon size={20} className="text-accent" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  chips,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  chips: string[];
}) {
  return (
    <div className="rounded-md border border-dashed border-line p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
          <Icon size={20} aria-hidden />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{body}</p>
          <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3">
            {chips.map((chip) => (
              <span key={chip} className="rounded-md border border-line p-3">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
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
