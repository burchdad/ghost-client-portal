import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import { humanizeEnum } from "@/lib/format";
import { getAdminVegaData } from "@/server/vega/service";

export default async function AdminVegaPage() {
  await requireInternalRole();
  const organizations = await getAdminVegaData();
  const totalLeadSignals = organizations.reduce(
    (total, organization) => total + organization.snapshot.summary.leadSignals,
    0,
  );
  const totalCompetitors = organizations.reduce(
    (total, organization) =>
      total + organization.snapshot.summary.capturedCompetitors,
    0,
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Vega</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Client growth intelligence
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Operational overview of client-facing SEO, AEO, GEO positioning,
          competitor context, lead signals, and engagement readiness.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Tracked clients" value={organizations.length} />
        <Metric label="Lead signals" value={totalLeadSignals} />
        <Metric label="Competitors" value={totalCompetitors} />
        <Metric
          label="Average score"
          value={
            organizations.length
              ? Math.round(
                  organizations.reduce(
                    (total, organization) =>
                      total + organization.snapshot.positioningScore,
                    0,
                  ) / organizations.length,
                )
              : 0
          }
        />
      </div>

      <div className="rounded-lg border border-line bg-panel">
        {organizations.length ? (
          organizations.map((organization) => (
            <div
              key={organization.id}
              className="border-b border-line p-5 last:border-b-0"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-accent">
                    {humanizeEnum(organization.accountStatus)}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {organization.name}
                  </h2>
                </div>
                <Link
                  href={`/admin/organizations/${organization.id}`}
                  className="rounded-md border border-line px-4 py-3 text-center text-sm hover:border-accent"
                >
                  Open Client
                </Link>
              </div>
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
                <Mini
                  label="Vega score"
                  value={String(organization.snapshot.positioningScore)}
                />
                <Mini
                  label="Projects"
                  value={String(organization.snapshot.summary.activeProjects)}
                />
                <Mini
                  label="Lead signals"
                  value={String(organization.snapshot.summary.leadSignals)}
                />
                <Mini
                  label="Competitors"
                  value={String(
                    organization.snapshot.summary.capturedCompetitors,
                  )}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-muted">
            Vega client intelligence appears after organizations are added.
          </p>
        )}
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-black/10 p-4">
      <p className="text-muted">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
