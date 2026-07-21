import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

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
          <div key={project.id} className="rounded-lg border border-line bg-panel p-5">
            <p className="text-sm text-accent">{project.organization.name}</p>
            <h2 className="text-xl font-semibold">{project.name}</h2>
          </div>
        ))}
      </div>
    </section>
  );
}
