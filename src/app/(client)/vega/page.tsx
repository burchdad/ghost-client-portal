import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getClientVegaData } from "@/server/vega/service";

export default async function VegaPage() {
  const { organization } = await requireOrganizationMembership();
  const { snapshot } = await getClientVegaData(organization.id);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Vega</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              Growth intelligence for {organization.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-muted">
              Client-visible positioning, competitor context, lead signals, and
              engagement activity gathered from your Ghost AI workspace.
            </p>
          </div>
          <div className="rounded-md border border-accent/40 bg-accent/10 px-5 py-4">
            <p className="text-sm text-muted">Vega signal score</p>
            <p className="mt-1 text-3xl font-semibold text-accent">
              {snapshot.positioningScore}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Active projects"
          value={snapshot.summary.activeProjects}
        />
        <Metric label="Lead signals" value={snapshot.summary.leadSignals} />
        <Metric
          label="Competitors"
          value={snapshot.summary.capturedCompetitors}
        />
        <Metric label="Engagement" value={snapshot.summary.openEngagements} />
      </div>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">SEO, AEO, GEO positioning</h2>
          <div className="mt-4 space-y-3">
            {snapshot.positioning.map((item) => (
              <div key={item.label} className="rounded-md bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-1 text-sm text-muted">{item.detail}</p>
                  </div>
                  <span className="rounded-md border border-line px-2 py-1 text-sm">
                    {item.score}
                  </span>
                </div>
                <p className="mt-3 text-sm text-accent">{item.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Lead gen and opportunities</h2>
          <div className="mt-4 space-y-3">
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
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Competitor analysis</h2>
          <div className="mt-4 space-y-3">
            {snapshot.competitors.map((competitor) => (
              <div
                key={competitor.name}
                className="rounded-md bg-white/[0.04] p-4"
              >
                <p className="font-semibold">{competitor.name}</p>
                <p className="mt-1 text-sm text-accent">{competitor.source}</p>
                <p className="mt-2 text-sm text-muted">{competitor.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5">
          <h2 className="text-xl font-semibold">Engagement signals</h2>
          <div className="mt-4 space-y-3">
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
          </div>
        </div>
      </section>
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

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-line p-5 text-sm text-muted">
      {text}
    </p>
  );
}
