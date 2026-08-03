import { requireClientWorkspace } from "@/lib/auth/guards";
import { getClientVegaData } from "@/server/vega/service";
import {
  createVegaLeadQueryAction,
  updateVegaLeadStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function VegaPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; notice?: string }>;
}) {
  const { organization } = await requireClientWorkspace();
  const { snapshot } = await getClientVegaData(organization.id);
  const message = (await searchParams) ?? {};

  return (
    <section className="space-y-6">
      <div className="panel-surface rounded-lg border border-line p-6">
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

      <form
        action={createVegaLeadQueryAction}
        className="rounded-lg border border-line bg-panel p-5"
      >
        {message.error || message.notice ? (
          <p
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              message.error
                ? "border-red-400/40 bg-red-500/10 text-red-100"
                : "border-accent/40 bg-accent/10 text-accent"
            }`}
          >
            {message.error ?? message.notice}
          </p>
        ) : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label
              className="text-sm font-medium text-muted"
              htmlFor="vega-lead-query"
            >
              Message Vega
            </label>
            <textarea
              id="vega-lead-query"
              name="prompt"
              className="mt-2 min-h-24 w-full rounded-md border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent"
              defaultValue={
                snapshot.queries[0]?.prompt ?? snapshot.queryPresets[0]?.query
              }
              placeholder="Ask Vega to pull a lead list. Include audience, industry, location, buyer role, and outreach goal."
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Send Request
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
      </form>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <div className="rounded-lg border border-line bg-panel">
          <div className="border-b border-line p-5">
            <h2 className="text-xl font-semibold">Lead records</h2>
            <p className="mt-2 text-sm text-muted">
              Qualified prospects and next steps available to this client.
            </p>
          </div>
          <div className="divide-y divide-line">
            {snapshot.leadRecords.length ? (
              snapshot.leadRecords.map((lead) => (
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
                    <LeadStatusButton
                      leadId={lead.id}
                      status="QUALIFIED"
                      label="Add to List"
                    />
                    <LeadStatusButton
                      leadId={lead.id}
                      status="READY_FOR_OUTREACH"
                      label="Draft Outreach"
                    />
                    <LeadStatusButton
                      leadId={lead.id}
                      status="ENGAGED"
                      label="Mark Engaged"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-muted">
                No Vega leads have been pulled for this workspace yet. Send a
                request above and Vega will populate this list.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Panel title="Recent Vega requests">
            {snapshot.queries.length ? (
              snapshot.queries.map((query) => (
                <div key={query.id} className="rounded-md bg-white/[0.04] p-4">
                  <p className="font-semibold">{query.prompt}</p>
                  <p className="mt-2 text-sm text-muted">
                    {query.status} - {query.resultCount} leads
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
                Requests you send to Vega will appear here.
              </p>
            )}
          </Panel>

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

function LeadStatusButton({
  leadId,
  status,
  label,
}: {
  leadId: string;
  status: string;
  label: string;
}) {
  return (
    <form action={updateVegaLeadStatusAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="status" value={status} />
      <button className="rounded-md border border-line px-3 py-2 text-sm hover:border-accent">
        {label}
      </button>
    </form>
  );
}
