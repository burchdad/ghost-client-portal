import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { updateProjectOperationsAction } from "./actions";

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
      clientActions: { orderBy: [{ priority: "desc" }, { dueAt: "asc" }] },
    },
  });
  const owners = await getDb().user.findMany({
    where: { internalRole: { not: null }, deletedAt: null },
    orderBy: { name: "asc" },
  });

  if (!project) {
    return (
      <section className="rounded-lg border border-line bg-panel p-6">
        Project not found.
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm text-accent">{project.organization.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
        <p className="mt-3 text-sm text-muted">
          {project.status} · {project.currentPhase}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Info
          label="Contract value"
          value={formatMoney(project.contractValueCents)}
        />
        <Info
          label="Amount paid"
          value={formatMoney(project.amountPaidCents)}
        />
        <Info
          label="Remaining"
          value={formatMoney(project.remainingBalanceCents)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Activation phases</h2>
          <div className="mt-4 space-y-2 text-sm">
            {project.phases.map((phase) => (
              <p key={phase.id} className="rounded-md bg-white/[0.035] p-3">
                {phase.name} · {phase.status}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Client onboarding actions</h2>
          <div className="mt-4 space-y-2 text-sm">
            {project.milestones.map((milestone) => (
              <p key={milestone.id} className="rounded-md bg-white/[0.035] p-3">
                {milestone.name} · {milestone.status}
              </p>
            ))}
          </div>
        </div>
      </div>
      <form
        action={updateProjectOperationsAction}
        className="rounded-lg border border-line bg-panel p-5"
      >
        <input type="hidden" name="projectId" value={project.id} />
        <h2 className="text-xl font-semibold">Client-visible operations</h2>
        <label className="mt-4 block text-sm text-muted">
          Client-visible summary
          <textarea
            name="clientVisibleSummary"
            defaultValue={project.clientVisibleSummary}
            rows={4}
            className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
          />
        </label>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-muted">
            Ghost lead
            <select
              name="projectOwnerId"
              defaultValue={project.projectOwnerId ?? ""}
              className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
            >
              <option value="">Unassigned</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted">
            Target completion
            <input
              name="targetCompletionDate"
              type="date"
              defaultValue={
                project.targetCompletionDate
                  ? project.targetCompletionDate.toISOString().slice(0, 10)
                  : ""
              }
              className="mt-2 w-full rounded-md border border-line bg-black/20 px-3 py-3 text-foreground"
            />
          </label>
        </div>
        <button className="mt-4 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
          Save project operations
        </button>
      </form>
      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold">Client actions</h2>
        <div className="mt-4 space-y-2 text-sm">
          {project.clientActions.length ? (
            project.clientActions.map((action) => (
              <p key={action.id} className="rounded-md bg-white/[0.035] p-3">
                {action.title} · {action.status}
              </p>
            ))
          ) : (
            <p className="text-muted">No client actions yet.</p>
          )}
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
