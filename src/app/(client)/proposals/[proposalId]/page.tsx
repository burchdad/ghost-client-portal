import { requireProposalAccess } from "@/lib/auth/guards";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposal } = await requireProposalAccess((await params).proposalId);

  return (
    <section className="rounded-lg border border-line bg-panel p-6">
      <p className="text-sm text-accent">{proposal.proposalNumber}</p>
      <h1 className="mt-2 text-3xl font-semibold">{proposal.title}</h1>
      <p className="mt-4 text-muted">{proposal.executiveSummary}</p>
    </section>
  );
}
