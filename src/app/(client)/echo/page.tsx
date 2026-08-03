import { requireClientWorkspace } from "@/lib/auth/guards";
import { getClientVegaData } from "@/server/vega/service";

export default async function EchoPage() {
  const { organization } = await requireClientWorkspace();
  const { snapshot } = await getClientVegaData(organization.id);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Echo</p>
        <h1 className="mt-3 text-3xl font-semibold">
          Marketing tactics for {organization.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Echo turns the workspace signals into tactical campaign moves: search
          capture, authority content, engagement sequences, and competitor
          response plays.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Tactics" value={snapshot.marketingTactics.length} />
        <Metric label="Lead signals" value={snapshot.summary.leadSignals} />
        <Metric label="Engagement" value={snapshot.summary.openEngagements} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {snapshot.marketingTactics.map((tactic) => (
          <div
            key={`${tactic.name}-${tactic.channel}`}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-accent">{tactic.channel}</p>
                <h2 className="mt-2 text-xl font-semibold">{tactic.name}</h2>
              </div>
              <span className="rounded-md border border-line px-2 py-1 text-xs text-muted">
                {tactic.status}
              </span>
            </div>
            <p className="mt-4 text-sm text-muted">{tactic.nextMove}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}
