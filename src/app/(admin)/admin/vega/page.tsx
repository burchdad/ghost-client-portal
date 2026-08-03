import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import { humanizeEnum } from "@/lib/format";
import { getAdminVegaData } from "@/server/vega/service";

export default async function AdminVegaPage() {
  await requireInternalRole();
  const organizations = await getAdminVegaData();
  const totalLeadRecords = organizations.reduce(
    (total, organization) => total + organization.snapshot.leadRecords.length,
    0,
  );
  const totalLists = organizations.reduce(
    (total, organization) => total + organization.snapshot.leadLists.length,
    0,
  );
  const totalOutreach = organizations.reduce(
    (total, organization) =>
      total + organization.snapshot.outreachSequences.length,
    0,
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Vega</p>
        <h1 className="mt-2 text-3xl font-semibold">LeadGen operations</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Admin view for client lead queries, pulled lists, qualified records,
          and outreach sequences.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Tracked clients" value={organizations.length} />
        <Metric label="Lead records" value={totalLeadRecords} />
        <Metric label="Lead lists" value={totalLists} />
        <Metric label="Outreach sequences" value={totalOutreach} />
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
                    {organization.snapshot.queryPresets[0]?.query ??
                      "No active Vega query"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/organizations/${organization.id}`}
                    className="rounded-md border border-line px-4 py-3 text-center text-sm hover:border-accent"
                  >
                    Open Client
                  </Link>
                  <button
                    type="button"
                    className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
                  >
                    Pull Leads
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
                <Mini
                  label="Lead records"
                  value={String(organization.snapshot.leadRecords.length)}
                />
                <Mini
                  label="Lists"
                  value={String(organization.snapshot.leadLists.length)}
                />
                <Mini
                  label="Outreach"
                  value={String(organization.snapshot.outreachSequences.length)}
                />
                <Mini
                  label="Engagement"
                  value={String(organization.snapshot.summary.openEngagements)}
                />
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {organization.snapshot.leadRecords.slice(0, 3).map((lead) => (
                  <div
                    key={`${organization.id}-${lead.company}-${lead.contact}`}
                    className="rounded-md border border-line bg-black/10 p-4"
                  >
                    <p className="text-sm text-accent">{lead.segment}</p>
                    <p className="mt-2 font-semibold">{lead.company}</p>
                    <p className="mt-1 text-sm text-muted">
                      {lead.contact} - {lead.emailStatus}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="p-5 text-sm text-muted">
            Vega leadgen workspaces appear after organizations are added.
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
