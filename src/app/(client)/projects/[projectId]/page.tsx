import { requireProjectAccess } from "@/lib/auth/guards";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { project } = await requireProjectAccess((await params).projectId);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm text-accent">{project.serviceCategory}</p>
        <h1 className="text-3xl font-semibold">{project.name}</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {["Overview", "Timeline", "Deliverables", "Approvals"].map((tab) => (
          <div key={tab} className="rounded-lg border border-line bg-panel p-5">
            <h2 className="font-semibold">{tab}</h2>
            <p className="mt-2 text-sm text-muted">Phase 1 workspace foundation.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
