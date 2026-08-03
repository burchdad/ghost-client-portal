import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getClientVegaData } from "@/server/vega/service";

export default async function VegaPage() {
  const { organization } = await requireOrganizationMembership();
  const { snapshot } = await getClientVegaData(organization.id);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Vega</p>
        <h1 className="mt-3 text-3xl font-semibold">
          Leads and engagement for {organization.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Vega shows client-specific lead signals, opportunity stages, intent,
          and active engagement moves from the portal workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Lead signals" value={snapshot.summary.leadSignals} />
        <Metric label="Engagement" value={snapshot.summary.openEngagements} />
        <Metric label="Vega score" value={snapshot.positioningScore} />
      </div>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Lead gen and opportunities">
          {snapshot.leads.length ? (
            snapshot.leads.map((lead) => (
              <div
                key={`${lead.name}-${lead.source}`}
                className="rounded-md border border-line bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{lead.name}</p>
                    <p className="mt-1 text-sm text-muted">{lead.source}</p>
                    <p className="mt-2 text-sm text-muted">{lead.nextStep}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p>{lead.stage}</p>
                    <p className="text-accent">Intent {lead.intentScore}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Empty text="Lead signals will appear after Ghost publishes Vega activity for this client." />
          )}
        </Panel>

        <Panel title="Engagement signals">
          {snapshot.engagement.length ? (
            snapshot.engagement.map((item) => (
              <div
                key={`${item.title}-${item.signal}`}
                className="rounded-md bg-white/[0.04] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm text-muted">{item.body}</p>
                  </div>
                  <span className="rounded-md border border-line px-2 py-1 text-xs text-muted">
                    {item.signal}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <Empty text="Engagement signals will appear as client actions and activity accumulate." />
          )}
        </Panel>
      </section>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
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

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-line p-5 text-sm text-muted">
      {text}
    </p>
  );
}
