import {
  ArrowRight,
  BarChart3,
  Compass,
  SearchCheck,
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
import { getClientVegaData } from "@/server/vega/service";

export default async function GeoPage() {
  const { organization } = await requireClientWorkspace();
  const { snapshot } = await getClientVegaData(organization.id);
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
