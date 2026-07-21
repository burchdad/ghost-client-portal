import Link from "next/link";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { getClientDashboardData } from "@/server/dashboard/service";

export default async function ProjectsPage() {
  const { user, organization } = await requireOrganizationMembership();
  const data = await getClientDashboardData(organization.id, user.id);

  return (
    <section>
      <h1 className="text-3xl font-semibold">Projects</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data.projects.length ? (
          data.projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-lg border border-line bg-panel p-5 hover:border-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-accent">
                    {project.serviceCategory}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{project.name}</h2>
                </div>
                <span className="rounded-md border border-line px-2 py-1 text-xs text-muted">
                  {project.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">
                {project.clientVisibleSummary}
              </p>
              <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
                <p>Phase: {project.currentPhase}</p>
                <p>Progress: {project.calculatedProgress}%</p>
                <p>Target: {formatDate(project.targetCompletionDate)}</p>
                <p>Actions: {project.openActionCount}</p>
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">
            No active projects are visible yet.
          </p>
        )}
      </div>
    </section>
  );
}
