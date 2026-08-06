import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  AtSign,
  FileText,
  Megaphone,
  MessageSquareText,
  RadioTower,
} from "lucide-react";
import {
  EmptyWorkspace,
  MetricCard,
  PageHero,
  SectionPanel,
  StatusBadge,
} from "@/components/workspace-ui";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { humanizeEnum } from "@/lib/format";
import { getClientVegaData } from "@/server/vega/service";

const channelIcons: Record<string, LucideIcon> = {
  "SEO / AEO / GEO": RadioTower,
  Content: FileText,
  "Email / CRM": AtSign,
  Positioning: Megaphone,
};

export default async function EchoPage() {
  const { organization } = await requireClientWorkspace();
  const { snapshot } = await getClientVegaData(organization.id);
  const readyLeads = snapshot.leadRecords.filter((lead) =>
    ["QUALIFIED", "READY_FOR_OUTREACH", "ENGAGED"].includes(lead.stage),
  );
  const configuredLanes = snapshot.positioning.filter(
    (lane) => !lane.status.toLowerCase().includes("not yet"),
  );

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Echo marketing command"
        title={`Campaign tactics for ${organization.name}`}
        body="Echo turns Vega lead signals and GEO visibility gaps into concrete campaign plays: search capture, authority content, email sequences, and competitor response moves."
        metrics={[
          {
            label: "Tactics",
            value: String(snapshot.marketingTactics.length),
            detail: "Campaign moves",
          },
          {
            label: "Lead signals",
            value: String(readyLeads.length),
            detail: "Ready for outreach",
          },
          {
            label: "Visibility lanes",
            value: `${configuredLanes.length}/${snapshot.positioning.length}`,
            detail: "Configured inputs",
          },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Campaign readiness"
          value={readyLeads.length ? "Live" : "Planning"}
          detail={
            readyLeads.length
              ? "Vega has usable prospect signals for outreach planning."
              : "Pull leads in Vega to unlock stronger outreach plays."
          }
          tone={readyLeads.length ? "accent" : "warning"}
        />
        <MetricCard
          label="Search input"
          value={String(snapshot.positioningScore)}
          detail="GEO score powering search and competitor plays."
        />
        <MetricCard
          label="Engagement"
          value={String(snapshot.summary.openEngagements)}
          detail="Open conversations and follow-up moments."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <SectionPanel
          title="Tactical campaign board"
          eyebrow="Echo plays"
          aside={<StatusBadge tone="accent">Client-visible</StatusBadge>}
        >
          {snapshot.marketingTactics.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {snapshot.marketingTactics.map((tactic) => (
                <TacticCard
                  key={`${tactic.name}-${tactic.channel}`}
                  tactic={tactic}
                />
              ))}
            </div>
          ) : (
            <EmptyWorkspace
              icon={MessageSquareText}
              title="No campaign tactics are queued yet"
              body="Echo needs a lead source, visibility gap, or project milestone before it can publish tactical campaign moves to the workspace."
              steps={[
                "Pull prospects with Vega",
                "Capture GEO positioning gaps",
                "Publish campaign moves here",
              ]}
            />
          )}
        </SectionPanel>

        <SectionPanel title="Recommended operating flow" eyebrow="Vega to Echo">
          <div className="space-y-3">
            <FlowStep
              icon={RadioTower}
              title="Map the market"
              body="Use GEO to capture SEO, AEO, GEO, competitor context, and visibility gaps."
              status={`${snapshot.positioningScore}/100 visibility`}
            />
            <FlowStep
              icon={AtSign}
              title="Source the buyers"
              body="Use Vega to pull qualified prospects, contact paths, and list segments."
              status={`${readyLeads.length} ready leads`}
            />
            <FlowStep
              icon={Megaphone}
              title="Launch the move"
              body="Echo turns the strongest signal into content, email, and response tactics."
              status={humanizeEnum(
                snapshot.marketingTactics[0]?.status ?? "DRAFT",
              )}
            />
          </div>
        </SectionPanel>
      </section>
    </section>
  );
}

function TacticCard({
  tactic,
}: {
  tactic: {
    name: string;
    channel: string;
    status: string;
    nextMove: string;
  };
}) {
  const Icon = channelIcons[tactic.channel] ?? Megaphone;

  return (
    <article className="rounded-md border border-line bg-white/[0.035] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
          <Icon size={20} aria-hidden />
        </div>
        <StatusBadge
          tone={
            tactic.status.toLowerCase().includes("ready") ? "accent" : "default"
          }
        >
          {tactic.status}
        </StatusBadge>
      </div>
      <p className="mt-4 text-sm text-accent">{tactic.channel}</p>
      <h2 className="mt-2 text-xl font-semibold">{tactic.name}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{tactic.nextMove}</p>
      <button className="mt-5 inline-flex items-center gap-2 rounded-md border border-line px-4 py-3 text-sm transition hover:border-accent hover:text-accent">
        Review tactic
        <ArrowRight size={16} aria-hidden />
      </button>
    </article>
  );
}

function FlowStep({
  icon: Icon,
  title,
  body,
  status,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  status: string;
}) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-accent/30 bg-accent/10 p-2 text-accent">
          <Icon size={18} aria-hidden />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{title}</p>
            <StatusBadge>{status}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}
