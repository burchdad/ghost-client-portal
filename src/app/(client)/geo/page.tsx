import {
  ArrowRight,
  BarChart3,
  Compass,
  CheckCircle2,
  Clock,
  ExternalLink,
  SearchCheck,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  ProgressBar,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import {
  getGeoApprovalSync,
  type GeoApprovalItem,
  type GeoApprovalSync,
} from "@/server/geo-command/service";
import { getClientVegaData } from "@/server/vega/service";
import { decideGeoApprovalAction } from "./actions";

export default async function GeoPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; error?: string }>;
}) {
  const { organization } = await requireClientWorkspace();
  const [{ snapshot }, approvalSync] = await Promise.all([
    getClientVegaData(organization.id),
    getGeoApprovalSync(organization),
  ]);
  const params = (await searchParams) ?? {};
  const configuredLanes = snapshot.positioning.filter(
    (item) => !item.status.toLowerCase().includes("not yet"),
  );
  const realCompetitors = snapshot.competitors.filter(
    (competitor) => competitor.name !== "Competitor set needed",
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="GEO intelligence"
        title={`Search visibility command for ${organization.name}`}
        body="Track organic search, answer engine readiness, generative discovery, and competitor gaps as Ghost builds the visibility layer around your brand."
        actions={
          <a
            href="https://geo.ghostai.solutions/dashboard/approvals"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white/[0.04] px-4 py-3 text-sm font-medium hover:border-accent"
          >
            Open standalone G.E.O.
            <ExternalLink size={15} aria-hidden />
          </a>
        }
        metrics={[
          {
            label: "Visibility",
            value: String(snapshot.positioningScore),
            detail: "Composite score",
          },
          {
            label: "Active lanes",
            value: `${configuredLanes.length}/${snapshot.positioning.length}`,
            detail: "SEO, AEO, GEO, competitors",
          },
          {
            label: "Competitors",
            value: String(realCompetitors.length),
            detail: "Tracked set",
          },
        ]}
      />

      {params?.notice ? (
        <p className="rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          {params.notice}
        </p>
      ) : null}
      {params?.error ? (
        <p className="rounded-md border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {params.error}
        </p>
      ) : null}

      <GeoApprovalSyncPanel approvalSync={approvalSync} />

      <section className="grid gap-4 md:grid-cols-4">
        {snapshot.positioning.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={String(item.score)}
            detail={item.status}
            tone={item.score >= 60 ? "accent" : "default"}
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionPanel
          title="Positioning lanes"
          eyebrow="SEO / AEO / GEO"
          aside={<StatusBadge>{snapshot.positioningScore}/100</StatusBadge>}
        >
          <div className="space-y-4">
            {snapshot.positioning.map((item) => (
              <div key={item.label} className="rounded-md bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {item.detail}
                    </p>
                  </div>
                  <StatusBadge tone={item.score >= 60 ? "accent" : "default"}>
                    {item.score}
                  </StatusBadge>
                </div>
                <div className="mt-4">
                  <ProgressBar value={item.score} />
                </div>
                <p className="mt-3 text-sm text-accent">{item.status}</p>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Competitor analysis"
          eyebrow="Market context"
          aside={<StatusBadge>{realCompetitors.length} tracked</StatusBadge>}
        >
          <div className="space-y-3">
            {realCompetitors.length ? (
              snapshot.competitors.map((competitor) => (
                <div
                  key={competitor.name}
                  className="rounded-md border border-line bg-white/[0.04] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{competitor.name}</p>
                      <p className="mt-1 text-sm text-accent">
                        {competitor.source}
                      </p>
                    </div>
                    <Target size={18} className="text-accent" aria-hidden />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {competitor.note}
                  </p>
                </div>
              ))
            ) : (
              <EmptyWorkspace
                icon={Compass}
                title="Competitor set needed"
                body="Add the competitors your client cares about so GEO can compare search coverage, answer readiness, positioning gaps, and campaign angles."
                steps={[
                  "Capture top local competitors",
                  "Map service and content gaps",
                  "Turn gaps into Echo tactics",
                ]}
              />
            )}
          </div>
        </SectionPanel>
      </section>

      <SectionPanel
        title="Visibility opportunities"
        eyebrow="Recommended moves"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Opportunity
            icon={SearchCheck}
            title="Search capture"
            body="Prioritize service pages, local intent queries, and proof content that can earn organic demand."
          />
          <Opportunity
            icon={BarChart3}
            title="Answer readiness"
            body="Create concise structured answers, FAQs, and schema-ready content for direct response engines."
          />
          <Opportunity
            icon={ArrowRight}
            title="Generative discovery"
            body="Feed GEO and Echo with competitor gaps so campaign content strengthens AI-assisted discovery paths."
          />
        </div>
      </SectionPanel>
    </section>
  );
}

function GeoApprovalSyncPanel({
  approvalSync,
}: {
  approvalSync: GeoApprovalSync;
}) {
  if (approvalSync.status !== "connected") {
    return (
      <SectionPanel
        title="Approval sync"
        eyebrow="G.E.O. connection"
        aside={<StatusBadge tone="warning">{approvalSync.status}</StatusBadge>}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm leading-6 text-muted">
              {approvalSync.message}
            </p>
            <p className="mt-3 text-xs text-muted">
              Base: {approvalSync.baseUrl}
              {approvalSync.clientId ? ` | Client: ${approvalSync.clientId}` : ""}
            </p>
          </div>
          <a
            href={`${approvalSync.baseUrl}/dashboard/approvals`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-3 text-sm hover:border-accent"
          >
            Check G.E.O.
            <ExternalLink size={15} aria-hidden />
          </a>
        </div>
      </SectionPanel>
    );
  }

  const center = approvalSync.center;
  const pending = center.clientQueue;

  return (
    <SectionPanel
      title="Client approvals"
      eyebrow="Synced from G.E.O."
      aside={<StatusBadge tone="accent">{center.status}</StatusBadge>}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <ApprovalMetric
          label="Pending your review"
          value={center.summary.clientPending}
          icon={Clock}
        />
        <ApprovalMetric
          label="With Ghost operators"
          value={center.summary.operatorPending}
          icon={ShieldCheck}
        />
        <ApprovalMetric
          label="GBP drafts"
          value={center.summary.gbpWriteRequests}
          icon={Compass}
        />
        <ApprovalMetric
          label="Approved"
          value={center.summary.approved}
          icon={CheckCircle2}
        />
      </div>

      <p className="mt-5 text-sm leading-6 text-muted">{center.boundary}</p>

      <div className="mt-5 space-y-4">
        {pending.length ? (
          pending.map((approval) => (
            <GeoApprovalCard key={approval.id} approval={approval} />
          ))
        ) : (
          <div className="rounded-md border border-line bg-black/10 p-4">
            <p className="font-semibold">No client approvals waiting.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              New G.E.O. work that needs client approval will appear here before
              Ghost can move it into operator execution.
            </p>
          </div>
        )}
      </div>
    </SectionPanel>
  );
}

function ApprovalMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-4">
      <Icon size={18} className="text-accent" aria-hidden />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

function GeoApprovalCard({ approval }: { approval: GeoApprovalItem }) {
  const payloadEntries = Object.entries(approval.proposedPayload || {}).slice(
    0,
    5,
  );

  return (
    <article className="rounded-md border border-line bg-white/[0.035] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="accent">{approval.operationLabel}</StatusBadge>
            <StatusBadge>{approval.statusLabel}</StatusBadge>
            <StatusBadge
              tone={approval.riskLevel === "high" ? "danger" : "default"}
            >
              {approval.riskLevel} risk
            </StatusBadge>
          </div>
          <h3 className="mt-4 text-xl font-semibold">{approval.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {approval.summary || approval.nextStep}
          </p>
        </div>
        <p className="rounded-md border border-line bg-black/10 px-3 py-2 text-xs text-muted">
          Live mutation: {approval.liveMutationEnabled ? "enabled" : "off"}
        </p>
      </div>

      {payloadEntries.length ? (
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
          {payloadEntries.map(([key, value]) => (
            <div key={key} className="rounded-md border border-line p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                {key}
              </p>
              <p className="mt-1 break-words text-muted">
                {formatPayloadValue(value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {approval.findings.length ? (
        <div className="mt-4 space-y-2">
          {approval.findings.map((finding) => (
            <p
              key={finding.id}
              className="rounded-md border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100"
            >
              {finding.severity}: {finding.title}
            </p>
          ))}
        </div>
      ) : null}

      <form action={decideGeoApprovalAction} className="mt-5 space-y-3">
        <input type="hidden" name="approvalId" value={approval.id} />
        <textarea
          name="note"
          rows={2}
          maxLength={1000}
          placeholder="Optional note for Ghost"
          className="w-full rounded-md border border-line bg-black/20 px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <div className="flex flex-wrap gap-2">
          <button
            name="decisionAction"
            value="client_approve"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Approve
          </button>
          <button
            name="decisionAction"
            value="client_request_changes"
            className="rounded-md border border-line px-4 py-2 text-sm hover:border-accent"
          >
            Request changes
          </button>
          <button
            name="decisionAction"
            value="client_reject"
            className="rounded-md border border-red-300/30 px-4 py-2 text-sm text-red-100 hover:border-red-200"
          >
            Reject
          </button>
        </div>
      </form>
    </article>
  );
}

function formatPayloadValue(value: unknown) {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return JSON.stringify(value);
}

function Opportunity({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-4">
      <Icon size={20} className="text-accent" aria-hidden />
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
