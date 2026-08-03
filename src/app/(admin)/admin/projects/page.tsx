import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { humanizeEnum } from "@/lib/format";

export default async function AdminProjectsPage() {
  await requireInternalRole();
  const projects = await getDb().project.findMany({
    include: { organization: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Admin projects</h1>
      <div className="mt-6 space-y-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/admin/projects/${project.id}`}
            className="block rounded-lg border border-line bg-panel p-5 transition hover:border-accent hover:bg-white/[0.035]"
          >
            <p className="text-sm text-accent">{project.organization.name}</p>
            <h2 className="text-xl font-semibold">{project.name}</h2>
            <p className="mt-2 text-sm text-muted">
              {humanizeEnum(project.status)} - {project.currentPhase}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
