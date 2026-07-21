import Link from "next/link";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export default async function ProjectsPage() {
  const { organization } = await requireOrganizationMembership();
  const projects = await getDb().project.findMany({
    where: { organizationId: organization.id, deletedAt: null, portalVisible: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Projects</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="rounded-lg border border-line bg-panel p-5 hover:border-accent">
            <p className="text-sm text-accent">{project.serviceCategory}</p>
            <h2 className="mt-2 text-xl font-semibold">{project.name}</h2>
            <p className="mt-3 text-sm text-muted">{project.clientVisibleSummary}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
