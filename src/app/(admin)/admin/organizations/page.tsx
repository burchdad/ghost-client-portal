import Link from "next/link";
import { requireInternalRole } from "@/lib/auth/guards";
import {
  billingModelLabel,
  clientTypeLabel,
  portalStatusLabel,
} from "@/lib/client-classification";
import { getDb } from "@/lib/db";
import { humanizeEnum } from "@/lib/format";

export default async function AdminOrganizationsPage() {
  await requireInternalRole();
  const organizations = await getDb().organization.findMany({
    orderBy: { name: "asc" },
  });
  const paidClients = organizations.filter(
    (organization) => organization.clientType === "PAID_CLIENT",
  ).length;
  const tradeClients = organizations.filter(
    (organization) => organization.clientType === "TRADE_BARTER_CLIENT",
  ).length;
  const invitedClients = organizations.filter(
    (organization) => organization.portalStatus === "INVITED",
  ).length;
  const activeClients = organizations.filter(
    (organization) => organization.portalStatus === "ACTIVE",
  ).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-panel p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-accent">
            Client records
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Organizations</h1>
          <p className="mt-2 text-sm text-muted">
            Manage paying clients, trade clients, prospects, and portal
            invitations.
          </p>
        </div>
        <Link
          href="/admin/organizations/new"
          className="inline-flex justify-center rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
        >
          Add client
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Paid clients" value={String(paidClients)} />
        <Info label="Trade clients" value={String(tradeClients)} />
        <Info label="Invited" value={String(invitedClients)} />
        <Info label="Active portals" value={String(activeClients)} />
      </div>
      <div className="mt-6 space-y-3">
        {organizations.map((organization) => (
          <Link
            key={organization.id}
            href={`/admin/organizations/${organization.id}`}
            className="block rounded-lg border border-line bg-panel p-5 transition hover:border-accent hover:bg-white/[0.035]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{organization.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {clientTypeLabel(organization.clientType)} -{" "}
                  {billingModelLabel(organization.billingModel)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-line px-2 py-1 text-muted">
                  {portalStatusLabel(organization.portalStatus)}
                </span>
                <span className="rounded-md border border-line px-2 py-1 text-muted">
                  {humanizeEnum(organization.accountStatus)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
