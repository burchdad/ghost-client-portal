import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getClientVegaData } from "@/server/vega/service";

export default async function VegaPage() {
  const { organization } = await requireOrganizationMembership();
  const { snapshot } = await getClientVegaData(organization.id);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Vega</p>
        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              LeadGen console for {organization.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-muted">
              Query prospects, pull lead lists, review qualified records, and
              prepare outreach sequences from your Ghost AI client workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Prospects" value={snapshot.leadRecords.length} />
            <Metric label="Lists" value={snapshot.leadLists.length} />
            <Metric
              label="Outreach"
              value={snapshot.outreachSequences.length}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label
              className="text-sm font-medium text-muted"
              htmlFor="vega-lead-query"
            >
              Query Vega for leads
            </label>
            <input
              id="vega-lead-query"
              className="mt-2 w-full rounded-md border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent"
              defaultValue={snapshot.queryPresets[0]?.query}
              placeholder="Describe the audience, industry, location, buyer role, or intent signal"
            />
          </div>
          <button
            type="button"
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Query Leads
          </button>
          <button
            type="button"
            className="rounded-md border border-line px-5 py-3 text-sm hover:border-accent"
          >
            Pull List
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {snapshot.queryPresets.map((preset) => (
            <span
              key={preset.label}
              className="rounded-md border border-line bg-white/[0.035] px-3 py-2 text-xs text-muted"
            >
              {preset.label}: {preset.query}
            </span>
          ))}
        </div>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <div className="rounded-lg border border-line bg-panel">
          <div className="border-b border-line p-5">
            <h2 className="text-xl font-semibold">Lead records</h2>
            <p className="mt-2 text-sm text-muted">
              Qualified prospects and next steps available to this client.
            </p>
          </div>
          <div className="divide-y divide-line">
            {snapshot.leadRecords.map((lead) => (
              <div key={`${lead.company}-${lead.contact}`} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-accent">{lead.segment}</p>
                    <h3 className="mt-1 text-xl font-semibold">
                      {lead.company}
                    </h3>
                    <p className="mt-2 text-sm text-muted">
                      {lead.contact} - {lead.title}
                    </p>
                    <p className="mt-3 text-sm text-muted">{lead.nextStep}</p>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-80">
                    <Mini label="Stage" value={lead.stage} />
                    <Mini label="Intent" value={String(lead.intentScore)} />
                    <Mini label="Email" value={lead.emailStatus} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-line px-3 py-2 text-sm hover:border-accent"
                  >
                    Add to List
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-line px-3 py-2 text-sm hover:border-accent"
                  >
                    Draft Outreach
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-line px-3 py-2 text-sm hover:border-accent"
                  >
                    Mark Engaged
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Lead lists">
            {snapshot.leadLists.map((list) => (
              <div key={list.name} className="rounded-md bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{list.name}</p>
                    <p className="mt-1 text-sm text-muted">{list.source}</p>
                  </div>
                  <p className="text-2xl font-semibold">{list.count}</p>
                </div>
                <p className="mt-3 text-sm text-accent">{list.status}</p>
              </div>
            ))}
          </Panel>

          <Panel title="Email outreach">
            {snapshot.outreachSequences.map((sequence) => (
              <div
                key={sequence.name}
                className="rounded-md border border-line bg-white/[0.035] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{sequence.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {sequence.audience}
                    </p>
                  </div>
                  <span className="rounded-md border border-line px-2 py-1 text-xs text-muted">
                    {sequence.steps} steps
                  </span>
                </div>
                <p className="mt-3 text-sm text-accent">{sequence.status}</p>
                <p className="mt-2 text-sm text-muted">{sequence.nextAction}</p>
              </div>
            ))}
          </Panel>
        </div>
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
    <div className="rounded-md border border-line bg-black/10 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
