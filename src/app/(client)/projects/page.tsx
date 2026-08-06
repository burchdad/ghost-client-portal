import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  ProgressBar,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { getClientDashboardData } from "@/server/dashboard/service";

export default async function ProjectsPage() {
  const { user, organization } = await requireClientWorkspace();
  const data = await getClientDashboardData(organization.id, user.id);
  const activeProjects = data.projects.filter(
    (project) => project.status !== "COMPLETED",
  );
  const totalOpenActions = data.projects.reduce(
    (total, project) => total + project.openActionCount,
    0,
  );
  const averageProgress = data.projects.length
    ? Math.round(
        data.projects.reduce(
          (total, project) => total + project.calculatedProgress,
          0,
        ) / data.projects.length,
      )
    : 0;

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Project command"
        title={`Active workspaces for ${organization.name}`}
        body="Track delivery phases, milestones, client actions, owner assignments, and progress across every Ghost engagement attached to this workspace."
        metrics={[
          {
            label: "Projects",
            value: String(data.projects.length),
            detail: "Visible workspaces",
          },
          {
            label: "Open actions",
            value: String(totalOpenActions),
            detail: "Client or Ghost follow-ups",
          },
          {
            label: "Avg progress",
            value: `${averageProgress}%`,
            detail: "Across visible projects",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active"
          value={String(activeProjects.length)}
          detail="Projects currently in motion."
          tone="accent"
        />
        <MetricCard
          label="Remaining"
          value={formatMoney(data.summary.remainingCents)}
          detail="Balance connected to active delivery."
        />
        <MetricCard
          label="Awaiting approval"
          value={String(data.summary.awaitingApproval)}
          detail="Decision checkpoints in the workspace."
        />
      </section>

      {data.projects.length ? (
        <SectionPanel title="Project portfolio" eyebrow="Delivery work">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-lg border border-line bg-white/[0.035] p-5 transition hover:border-accent hover:bg-white/[0.055]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-accent">
                      {project.serviceCategory}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {project.name}
                    </h2>
                  </div>
                  <StatusBadge>{humanizeEnum(project.status)}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {project.clientVisibleSummary}
                </p>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted">{project.currentPhase}</span>
                    <span>{project.calculatedProgress}%</span>
                  </div>
                  <ProgressBar value={project.calculatedProgress} />
                </div>
                <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
                  <Mini
                    label="Target"
                    value={formatDate(project.targetCompletionDate)}
                  />
                  <Mini
                    label="Next milestone"
                    value={project.nextMilestone?.name ?? "To be scheduled"}
                  />
                  <Mini
                    label="Actions"
                    value={String(project.openActionCount)}
                  />
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm text-accent">
                  Open workspace
                  <ArrowRight size={16} aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </SectionPanel>
      ) : (
        <EmptyWorkspace
          icon={FolderKanban}
          title="No active projects are visible yet"
          body="Project workspaces appear after Ghost activates an engagement. Each workspace will show phase progress, milestones, open actions, files, and client-safe delivery notes."
          steps={[
            "Proposal accepted or project opened",
            "Ghost publishes the workspace",
            "Milestones and actions appear here",
          ]}
        />
      )}
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
