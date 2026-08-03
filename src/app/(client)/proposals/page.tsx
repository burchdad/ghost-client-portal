import Link from "next/link";
import { requireOrganizationMembership } from "@/lib/auth/guards";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { getDb } from "@/lib/db";

export default async function ProposalsPage() {
  const { organization } = await requireOrganizationMembership();
  const proposals = await getDb().proposal.findMany({
    where: { organizationId: organization.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section>
      <h1 className="text-3xl font-semibold">Proposals</h1>
      <div className="mt-6 space-y-3">
        {proposals.length ? (
          proposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/proposals/${proposal.id}`}
              className="block rounded-lg border border-line bg-panel p-5 transition hover:border-accent hover:bg-white/[0.035]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-accent">
                    {proposal.proposalNumber}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {proposal.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    Updated {formatDate(proposal.updatedAt)}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-semibold">
                    {formatMoney(proposal.totalCents, proposal.currency)}
                  </p>
                  <p className="mt-1 text-muted">
                    {humanizeEnum(proposal.status)}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-line bg-panel p-6 text-sm text-muted">
            No proposals are available in this workspace yet.
          </p>
        )}
      </div>
    </section>
  );
}
