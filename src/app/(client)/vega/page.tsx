import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  Mail,
  Phone,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { formatDate, humanizeEnum } from "@/lib/format";
import { getClientVegaData } from "@/server/vega/service";
import {
  createVegaLeadQueryAction,
  updateVegaLeadStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function VegaPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    notice?: string;
    scope?: "latest" | "all";
  }>;
}) {
  const { organization } = await requireClientWorkspace();
  const { snapshot } = await getClientVegaData(organization.id);
  const message = (await searchParams) ?? {};
  const scope =
    "scope" in message && message.scope === "all" ? "all" : "latest";
  const latestQuery = snapshot.queries[0];
  const latestLeadRecords = latestQuery
    ? snapshot.leadRecords.filter((lead) => lead.queryId === latestQuery.id)
    : snapshot.leadRecords;
  const displayedLeads =
    scope === "all" ? snapshot.leadRecords : latestLeadRecords;
  const sourceAuthIssue = latestQuery?.status === "AUTH_FAILED";
  const readyLeads = displayedLeads.filter((lead) =>
    ["READY_FOR_OUTREACH", "QUALIFIED", "ENGAGED"].includes(lead.stage),
  );
  const emailReadyLeads = displayedLeads.filter((lead) =>
    lead.emailStatus.toLowerCase().includes("ready"),
  );
  const averageIntent = displayedLeads.length
    ? Math.round(
        displayedLeads.reduce((total, lead) => total + lead.intentScore, 0) /
          displayedLeads.length,
      )
    : 0;

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Vega Lead Command"
        title={`LeadGen workspace for ${organization.name}`}
        body="Ask Vega for a market, review sourced prospects, build lists, and move qualified companies into outreach from one client-safe workspace."
        actions={
          snapshot.leadRecords.length ? (
            <a
              href="/vega/export"
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-3 text-sm hover:border-accent"
            >
              <Download size={16} aria-hidden />
              Export CSV
            </a>
          ) : null
        }
        metrics={[
          {
            label: "Prospects",
            value: String(displayedLeads.length),
            detail: scope === "all" ? "All saved leads" : "Latest request",
          },
          {
            label: "Outreach ready",
            value: String(emailReadyLeads.length),
            detail: "Have a contact path",
          },
          {
            label: "Avg intent",
            value: String(averageIntent),
            detail: "Fit and readiness score",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Qualified leads"
          value={String(readyLeads.length)}
          detail="Prospects ready for list, enrichment, or outreach review."
          tone="accent"
        />
        <MetricCard
          label="Saved lists"
          value={String(snapshot.leadLists.length)}
          detail="Segments Vega can use for campaigns and follow-up."
        />
        <MetricCard
          label="Recent requests"
          value={String(snapshot.queries.length)}
          detail="Lead pulls submitted from this client workspace."
        />
        <MetricCard
          label="Latest fulfillment"
          value={latestQuery ? `${latestQuery.fulfillmentRate}%` : "0%"}
          detail={
            latestQuery
              ? `${latestQuery.resultCount} of ${latestQuery.requestedCount} requested`
              : "No live query has been submitted yet."
          }
          tone={latestQuery?.fulfillmentRate === 100 ? "accent" : "warning"}
        />
      </section>

      <form
        action={createVegaLeadQueryAction}
        className="rounded-lg border border-line bg-panel p-5"
      >
        {sourceAuthIssue && !message.error ? (
          <Alert tone="warning">
            Lead Command needs a valid production access key before Vega can
            pull live prospect data.
          </Alert>
        ) : null}
        {message.error || message.notice ? (
          <Alert tone={message.error ? "danger" : "success"}>
            {message.error ?? message.notice}
          </Alert>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label
              className="text-sm font-medium text-muted"
              htmlFor="vega-lead-query"
            >
              Message Vega
            </label>
            <textarea
              id="vega-lead-query"
              name="prompt"
              className="mt-2 min-h-28 w-full rounded-md border border-line bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-accent"
              defaultValue={snapshot.queryPresets[0]?.query}
              placeholder="Example: Pull 10 HVAC companies in Houston, Texas that need a stronger website and have owner contact paths."
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-slate-950"
          >
            <Send size={16} aria-hidden />
            Send Request
          </button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {snapshot.queryPresets.map((preset) => (
            <div
              key={preset.label}
              className="rounded-md border border-line bg-white/[0.035] px-3 py-2 text-xs text-muted"
            >
              <p className="font-medium text-foreground">{preset.label}</p>
              <p className="mt-1">{preset.query}</p>
            </div>
          ))}
        </div>
      </form>

      {latestQuery ? (
        <section className="rounded-lg border border-line bg-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-accent">Latest source report</p>
              <h2 className="mt-1 text-xl font-semibold">
                Requested {latestQuery.requestedCount}, returned{" "}
                {latestQuery.resultCount}
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
                {latestQuery.guidance}
              </p>
            </div>
            <StatusBadge
              tone={
                ["COMPLETED", "NO_NEW_LEADS"].includes(latestQuery.status)
                  ? "accent"
                  : latestQuery.status === "AUTH_FAILED"
                    ? "warning"
                    : "danger"
              }
            >
              {humanizeEnum(latestQuery.status)}
            </StatusBadge>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_0.62fr]">
        <SectionPanel
          title={scope === "all" ? "All saved leads" : "Latest request leads"}
          eyebrow="Qualified prospects"
          aside={
            <div className="flex items-center gap-2">
              <a
                href="/vega"
                className={`rounded-md border px-3 py-1.5 text-xs ${scope === "latest" ? "border-accent text-accent" : "border-line text-muted"}`}
              >
                Latest pull
              </a>
              <a
                href="/vega?scope=all"
                className={`rounded-md border px-3 py-1.5 text-xs ${scope === "all" ? "border-accent text-accent" : "border-line text-muted"}`}
              >
                All saved
              </a>
            </div>
          }
        >
          {displayedLeads.length ? (
            <div className="grid gap-4">
              {displayedLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          ) : (
            <EmptyWorkspace
              icon={Search}
              title={
                scope === "all"
                  ? "No sourced leads yet"
                  : "No new leads in this request"
              }
              body={
                scope === "all"
                  ? "Send Vega a lead request with a clear industry, geography, buyer role, and outreach goal. Qualified records will populate here."
                  : "Vega did not add a new record from the latest pull. Existing matches remain available under All saved."
              }
              steps={[
                "Ask for a specific market",
                "Review contact confidence",
                "Move qualified leads to outreach",
              ]}
            />
          )}
        </SectionPanel>

        <div className="space-y-5">
          <SectionPanel title="Recent requests" eyebrow="Vega history">
            <div className="space-y-3">
              {snapshot.queries.length ? (
                snapshot.queries.map((query) => (
                  <div
                    key={query.id}
                    className="rounded-md bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{query.prompt}</p>
                      <StatusBadge
                        tone={
                          query.status === "COMPLETED" ? "accent" : "warning"
                        }
                      >
                        {query.resultCount}/{query.requestedCount}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {humanizeEnum(query.status)} via {query.source}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {formatDate(query.createdAt)}
                    </p>
                    <p className="mt-3 text-sm text-muted">{query.guidance}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
                  Requests you send to Vega will appear here.
                </p>
              )}
            </div>
          </SectionPanel>

          <SectionPanel title="Lead lists" eyebrow="Segments">
            <div className="space-y-3">
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
            </div>
          </SectionPanel>

          <SectionPanel title="Outreach queue" eyebrow="Echo handoff">
            <div className="space-y-3">
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
                    <StatusBadge>{sequence.steps} steps</StatusBadge>
                  </div>
                  <p className="mt-3 text-sm text-accent">{sequence.status}</p>
                  <p className="mt-2 text-sm text-muted">
                    {sequence.nextAction}
                  </p>
                </div>
              ))}
            </div>
          </SectionPanel>
        </div>
      </section>
    </section>
  );
}

function LeadCard({
  lead,
}: {
  lead: {
    id: string;
    company: string;
    contact: string;
    title: string;
    segment: string;
    stage: string;
    intentScore: number;
    emailStatus: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    source: string;
    sourceEvidence: string[];
    sourceConfidence: string;
    notes: string | null;
    nextStep: string;
  };
}) {
  const hasEmail = Boolean(lead.email);
  const hasPhone = Boolean(lead.phone);
  const hasWebsite = Boolean(lead.website);
  const sourceSummary = lead.sourceEvidence.length
    ? lead.sourceEvidence.slice(0, 3).join(" | ")
    : lead.source.replaceAll("_", " ");

  return (
    <article className="rounded-lg border border-line bg-white/[0.035] p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="accent">{lead.segment}</StatusBadge>
            <StatusBadge>{humanizeEnum(lead.stage)}</StatusBadge>
            <StatusBadge tone={lead.intentScore >= 80 ? "accent" : "default"}>
              Intent {lead.intentScore}
            </StatusBadge>
          </div>
          <h3 className="mt-3 text-2xl font-semibold">{lead.company}</h3>
          <p className="mt-2 text-sm text-muted">
            {lead.contact} - {lead.title}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            {lead.nextStep}
          </p>
          {lead.notes ? (
            <p className="mt-3 rounded-md border border-line bg-black/10 p-3 text-xs leading-5 text-muted">
              {lead.notes.split("\n").slice(0, 2).join(" ")}
            </p>
          ) : null}
          <div className="mt-3 rounded-md border border-accent/20 bg-accent/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              First-touch draft angle
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Lead with a specific growth gap for {lead.company}, reference the
              market signal Vega captured, and offer a quick audit before
              pitching a full engagement.
            </p>
          </div>
        </div>
        <div className="grid gap-2 text-sm">
          <ContactSignal
            icon={Mail}
            label="Email"
            value={hasEmail ? lead.email : lead.emailStatus}
            active={hasEmail}
          />
          <ContactSignal
            icon={Phone}
            label="Phone"
            value={
              hasPhone ? (
                <a href={`tel:${lead.phone}`} className="hover:text-accent">
                  {lead.phone}
                </a>
              ) : (
                "No callable phone captured"
              )
            }
            active={hasPhone}
          />
          <ContactSignal
            icon={ArrowUpRight}
            label="Website"
            value={
              hasWebsite ? (
                <a
                  href={lead.website ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all hover:text-accent"
                >
                  {lead.website}
                </a>
              ) : (
                "No website captured"
              )
            }
            active={hasWebsite}
          />
          <ContactSignal
            icon={ShieldCheck}
            label="Source"
            value={
              <span>
                <span className="block font-semibold">
                  {lead.sourceConfidence}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted">
                  {sourceSummary}
                </span>
              </span>
            }
            active
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <LeadStatusButton
          leadId={lead.id}
          status="QUALIFIED"
          label="Save to List"
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
    </article>
  );
}

function ContactSignal({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  active: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-black/10 p-3">
      <Icon
        size={16}
        className={active ? "mt-0.5 text-accent" : "mt-0.5 text-muted"}
        aria-hidden
      />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 font-medium">{value}</p>
      </div>
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
      <button className="rounded-md border border-line px-3 py-2 text-sm transition hover:border-accent hover:text-accent">
        {label}
      </button>
    </form>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const className =
    tone === "success"
      ? "border-accent/40 bg-accent/10 text-accent"
      : tone === "warning"
        ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
        : "border-red-400/40 bg-red-500/10 text-red-100";

  return (
    <p className={`mb-4 rounded-md border px-4 py-3 text-sm ${className}`}>
      <CheckCircle2 size={16} className="mr-2 inline" aria-hidden />
      {children}
    </p>
  );
}
