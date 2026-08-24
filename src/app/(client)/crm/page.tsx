import Link from "next/link";
import {
  ArrowRight,
  Download,
  Mail,
  Phone,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { formatDate, humanizeEnum } from "@/lib/format";
import { crmStages, getClientCrmData } from "@/server/crm/service";
import {
  createCrmOutreachDraftAction,
  markCrmLeadContactedAction,
  updateCrmLeadStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CrmPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    stage?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const { organization } = await requireClientWorkspace();
  const params = (await searchParams) ?? {};
  const data = await getClientCrmData({
    organizationId: organization.id,
    query: params.q,
    stage: params.stage,
  });
  const returnTo = buildReturnTo(params);

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Client CRM"
        title={`Relationship pipeline for ${organization.name}`}
        body="Work every sourced prospect from Vega through qualification, outreach, replies, booked calls, and closed outcomes. This is the client-safe CRM view for the active workspace."
        actions={
          <>
            <Link
              href="/vega"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Pull leads in Vega
              <Sparkles size={16} aria-hidden />
            </Link>
            <a
              href="/vega/export"
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-3 text-sm hover:border-accent"
            >
              Export CRM CSV
              <Download size={16} aria-hidden />
            </a>
          </>
        }
        metrics={[
          {
            label: "Records",
            value: String(data.summary.total),
            detail: "Tenant-scoped leads",
          },
          {
            label: "Ready",
            value: String(data.summary.outreachReady),
            detail: "Qualified or drafted",
          },
          {
            label: "Conversations",
            value: String(data.summary.activeConversations),
            detail: "Contacted, replied, booked",
          },
        ]}
      />

      {params.error || params.notice ? (
        <p
          className={`rounded-md border px-4 py-3 text-sm ${
            params.error
              ? "border-red-300/40 bg-red-500/10 text-red-100"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          {params.error ?? params.notice}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard
          label="Total leads"
          value={String(data.summary.total)}
          detail="Saved from Vega into the portal CRM."
          tone={data.summary.total ? "accent" : "default"}
        />
        <MetricCard
          label="Email ready"
          value={String(data.summary.emailReady)}
          detail="Records with a usable email field."
        />
        <MetricCard
          label="Outreach ready"
          value={String(data.summary.outreachReady)}
          detail="Qualified records needing next touch."
          tone={data.summary.outreachReady ? "warning" : "default"}
        />
        <MetricCard
          label="Active"
          value={String(data.summary.activeConversations)}
          detail="Live conversations and booked calls."
        />
        <MetricCard
          label="Won"
          value={String(data.summary.won)}
          detail="Converted opportunities."
          tone={data.summary.won ? "accent" : "default"}
        />
      </section>

      <SectionPanel title="Pipeline" eyebrow="Stage movement">
        <div className="grid gap-3 md:grid-cols-4">
          {data.stageCounts.map((stage) => (
            <Link
              key={stage.value}
              href={`/crm?stage=${stage.value}`}
              className="rounded-md border border-line bg-white/[0.035] p-4 transition hover:border-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{stage.label}</p>
                  <p className="mt-1 text-xs text-muted">{stage.detail}</p>
                </div>
                <p className="text-2xl font-semibold">{stage.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Lead records"
        eyebrow="Search and work"
        aside={
          <Link
            href="/crm"
            className="rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-accent hover:text-foreground"
          >
            Clear filters
          </Link>
        }
      >
        <form className="mb-5 grid gap-3 lg:grid-cols-[1fr_14rem_auto]">
          <label className="sr-only" htmlFor="crm-search">
            Search CRM
          </label>
          <input
            id="crm-search"
            name="q"
            defaultValue={params.q}
            placeholder="Search company, contact, segment, notes..."
            className="rounded-md border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <label className="sr-only" htmlFor="crm-stage">
            Filter by stage
          </label>
          <select
            id="crm-stage"
            name="stage"
            defaultValue={data.stage}
            className="rounded-md border border-line bg-background px-4 py-3 text-sm outline-none focus:border-accent"
          >
            <option value="ALL">All stages</option>
            {crmStages.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-slate-950">
            <Search size={16} aria-hidden />
            Search
          </button>
        </form>

        {data.leads.length ? (
          <div className="grid gap-4">
            {data.leads.map((lead) => (
              <article
                key={lead.id}
                className="rounded-lg border border-line bg-white/[0.035] p-4"
              >
                <div className="grid gap-4 xl:grid-cols-[1fr_18rem]">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={stageTone(lead.status)}>
                        {humanizeEnum(lead.status)}
                      </StatusBadge>
                      <StatusBadge>{lead.segment}</StatusBadge>
                      <StatusBadge>Intent {lead.intentScore}</StatusBadge>
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold">
                      {lead.company}
                    </h3>
                    <p className="mt-2 text-sm text-muted">
                      {lead.contactName ?? "Contact pending"} -{" "}
                      {lead.title ?? "Decision maker"}
                    </p>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                      {lead.nextStep ?? "Review this lead and choose a next CRM move."}
                    </p>
                    {lead.notes ? (
                      <p className="mt-3 line-clamp-3 rounded-md border border-line bg-black/10 p-3 text-xs leading-5 text-muted">
                        {lead.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 text-sm">
                    <Signal icon={Mail} label="Email" value={lead.email ?? "Needs email"} />
                    <Signal icon={Phone} label="Phone" value={lead.phone ?? "Needs phone"} />
                    <Signal
                      icon={Users}
                      label="Source"
                      value={`${humanizeEnum(lead.source)} - ${formatDate(lead.createdAt)}`}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={updateCrmLeadStatusAction} className="flex gap-2">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <select
                      name="status"
                      defaultValue={lead.status}
                      className="rounded-md border border-line bg-background px-3 py-2 text-sm"
                    >
                      {crmStages.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-md border border-line px-3 py-2 text-sm hover:border-accent">
                      Move
                    </button>
                  </form>
                  <form action={createCrmOutreachDraftAction}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button className="rounded-md border border-line px-3 py-2 text-sm hover:border-accent">
                      Draft outreach
                    </button>
                  </form>
                  <form action={markCrmLeadContactedAction}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button className="rounded-md border border-line px-3 py-2 text-sm hover:border-accent">
                      Mark contacted
                    </button>
                  </form>
                  <Link
                    href={`/crm/${lead.id}`}
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950"
                  >
                    Open record
                    <ArrowRight size={15} aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyWorkspace
            icon={Users}
            title="No CRM records match this view"
            body="Pull leads in Vega or clear your filters. Every saved Vega prospect becomes a CRM record for this workspace."
            steps={["Pull leads", "Qualify records", "Draft outreach"]}
          />
        )}
      </SectionPanel>
    </section>
  );
}

function Signal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-line bg-black/10 p-3">
      <Icon size={16} className="mt-0.5 text-accent" aria-hidden />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 break-words font-medium">{value}</p>
      </div>
    </div>
  );
}

function stageTone(status: string) {
  if (["WON", "BOOKED", "REPLIED"].includes(status)) return "accent";
  if (["READY_FOR_OUTREACH", "CONTACTED"].includes(status)) return "warning";
  if (status === "LOST") return "danger";
  return "default";
}

function buildReturnTo(params: { q?: string; stage?: string }) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.stage) query.set("stage", params.stage);
  const value = query.toString();
  return value ? `/crm?${value}` : "/crm";
}
