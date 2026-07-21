import { requireOrganizationMembership } from "@/lib/auth/guards";
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
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className="rounded-lg border border-line bg-panel p-5"
          >
            <p className="text-sm text-accent">{proposal.proposalNumber}</p>
            <h2 className="mt-1 text-xl font-semibold">{proposal.title}</h2>
            <p className="mt-2 text-sm text-muted">
              {proposal.status.replaceAll("_", " ").toLowerCase()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
