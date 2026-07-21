import Link from "next/link";
import type { ProposalStatus } from "@prisma/client";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

const statuses: ProposalStatus[] = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "APPROVED",
  "SIGNATURE_PENDING",
  "PAYMENT_PENDING",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
];

export default async function AdminProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: ProposalStatus; q?: string }>;
}) {
  await requireInternalRole();
  const filters = await searchParams;
  const proposals = await getDb().proposal.findMany({
    where: {
      status: filters.status || undefined,
      OR: filters.q
        ? [
            { title: { contains: filters.q, mode: "insensitive" } },
            { organization: { name: { contains: filters.q, mode: "insensitive" } } },
          ]
        : undefined,
    },
    include: { organization: true, acceptances: { take: 1, orderBy: { acceptedAt: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin proposals</h1>
          <p className="mt-2 text-sm text-muted">Manage portal-specific client proposal records.</p>
        </div>
        <Link href="/admin/proposals/new" className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950">
          New Proposal
        </Link>
      </div>
      <form className="mt-6 grid gap-3 rounded-lg border border-line bg-panel p-4 md:grid-cols-[1fr_220px_auto]">
        <input name="q" placeholder="Search organization or title" defaultValue={filters.q} className="rounded-md border border-line bg-black/20 px-3 py-3 text-sm" />
        <select name="status" defaultValue={filters.status ?? ""} className="rounded-md border border-line bg-black/20 px-3 py-3 text-sm">
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <button className="rounded-md border border-line px-4 py-3 text-sm">Filter</button>
      </form>
      <div className="mt-6 space-y-3">
        {proposals.map((proposal) => (
          <Link key={proposal.id} href={`/admin/proposals/${proposal.id}`} className="block rounded-lg border border-line bg-panel p-5 hover:border-accent">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-accent">{proposal.organization.name}</p>
                <h2 className="text-xl font-semibold">{proposal.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  Viewed: {proposal.viewedAt ? proposal.viewedAt.toLocaleString() : "not yet"} · Accepted: {proposal.acceptances[0]?.signerName ?? "not yet"}
                </p>
              </div>
              <ProposalStatusBadge status={proposal.status} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
