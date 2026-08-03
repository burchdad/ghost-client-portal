import { requireOrganizationMembership } from "@/lib/auth/guards";
import { getClientVegaData } from "@/server/vega/service";

export default async function GeoPage() {
  const { organization } = await requireOrganizationMembership();
  const { snapshot } = await getClientVegaData(organization.id);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-line bg-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">GEO</p>
        <h1 className="mt-3 text-3xl font-semibold">
          Search and generative visibility for {organization.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          GEO tracks SEO, AEO, and generative engine positioning, competitor
          context, and the visibility signals Ghost is building for your brand.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Visibility score" value={snapshot.positioningScore} />
        <Metric label="Positioning lanes" value={snapshot.positioning.length} />
        <Metric
          label="Competitors"
          value={snapshot.summary.capturedCompetitors}
        />
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
      </section>

      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold">Visibility summary</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {snapshot.positioning.map((item) => (
            <div key={item.label} className="rounded-md border border-line p-4">
              <p className="text-sm text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.score}</p>
              <p className="mt-2 text-sm text-accent">{item.status}</p>
            </div>
          ))}
        </div>
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
