import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireInternalRole();
  const project = await getDb().project.findUnique({
    where: { id: (await params).projectId },
    include: {
      organization: true,
      proposal: true,
      payments: { orderBy: { createdAt: "desc" } },
      phases: { orderBy: { sortOrder: "asc" } },
      milestones: true,
    },
  });

  if (!project) {
    return <section className="rounded-lg border border-line bg-panel p-6">Project not found.</section>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm text-accent">{project.organization.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
        <p className="mt-3 text-sm text-muted">{project.status} · {project.currentPhase}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Info label="Contract value" value={formatMoney(project.contractValueCents)} />
        <Info label="Amount paid" value={formatMoney(project.amountPaidCents)} />
        <Info label="Remaining" value={formatMoney(project.remainingBalanceCents)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Activation phases</h2>
          <div className="mt-4 space-y-2 text-sm">
            {project.phases.map((phase) => <p key={phase.id} className="rounded-md bg-white/[0.035] p-3">{phase.name} · {phase.status}</p>)}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Client onboarding actions</h2>
          <div className="mt-4 space-y-2 text-sm">
            {project.milestones.map((milestone) => <p key={milestone.id} className="rounded-md bg-white/[0.035] p-3">{milestone.name} · {milestone.status}</p>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
