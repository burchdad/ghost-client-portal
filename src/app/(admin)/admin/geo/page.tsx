import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import { humanizeEnum } from "@/lib/format";
import { getGeoApprovalSync } from "@/server/geo-command/service";
import { getAdminVegaData } from "@/server/vega/service";

export default async function AdminGeoPage() {
  await requireInternalRole();
  const organizations = await getAdminVegaData();
  const approvalSyncs = await Promise.all(
    organizations.map(async (organization) => ({
      organizationId: organization.id,
      sync: await getGeoApprovalSync(organization),
    })),
  );
  const syncByOrganization = new Map(
    approvalSyncs.map((item) => [item.organizationId, item.sync]),
  );
  const totalCompetitors = organizations.reduce(
    (total, organization) =>
      total + organization.snapshot.summary.capturedCompetitors,
    0,
  );
  const averageVisibility = organizations.length
    ? Math.round(
        organizations.reduce(
          (total, organization) =>
            total + organization.snapshot.positioningScore,
          0,
        ) / organizations.length,
      )
    : 0;
  const connectedApprovals = approvalSyncs.filter(
    (item) => item.sync.status === "connected",
  );
  const totalClientPending = connectedApprovals.reduce(
    (total, item) =>
      total +
      (item.sync.status === "connected"
        ? item.sync.center.summary.clientPending
        : 0),
    0,
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-accent">GEO</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Search and generative visibility
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Admin view for client SEO, AEO, GEO positioning, competitor context,
          and visibility signals.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Tracked clients" value={organizations.length} />
        <Metric label="Competitors" value={totalCompetitors} />
        <Metric label="Average visibility" value={averageVisibility} />
        <Metric label="G.E.O. synced clients" value={connectedApprovals.length} />
        <Metric label="Client approvals" value={totalClientPending} />
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
                  <p className="mt-2 text-sm text-muted">
                    Approval sync:{" "}
                    {syncByOrganization.get(organization.id)?.status ??
                      "unavailable"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/organizations/${organization.id}`}
                    className="rounded-md border border-line px-4 py-3 text-center text-sm hover:border-accent"
                  >
                    Open Client
                  </Link>
                  <a
                    href="https://geo.ghostai.solutions/admin/geo-command/approvals"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-line px-4 py-3 text-center text-sm hover:border-accent"
                  >
                    Open G.E.O.
                  </a>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
                {organization.snapshot.positioning.map((item) => (
                  <Mini
                    key={item.label}
                    label={item.label}
                    value={`${item.score} - ${item.status}`}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-muted">
            GEO visibility appears after organizations are added.
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
