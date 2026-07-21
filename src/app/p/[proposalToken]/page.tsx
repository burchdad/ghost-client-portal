import { ProposalUnavailable } from "@/components/proposals/proposal-unavailable";
import { ProposalView } from "@/components/proposals/proposal-view";
import { getPublicProposalAvailability } from "@/server/proposals/repository";
import { trackProposalView } from "@/server/proposals/view-tracking";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ proposalToken: string }>;
}) {
  const { proposalToken } = await params;
  const availability = await getPublicProposalAvailability(proposalToken, {
    allowFixtureFallback: true,
  });

  if (availability.status === "unavailable") {
    return <ProposalUnavailable correlationId={availability.correlationId} />;
  }

  if (availability.status === "expired") {
    return (
      <ProposalUnavailable
        title="Proposal expired"
        correlationId={availability.correlationId}
      />
    );
  }

  if (availability.proposal.id !== "fixture-gray-proposal") {
    void trackProposalView(availability.proposal.id);
  }

  return (
    <ProposalView
      proposal={availability.proposal}
      token={proposalToken}
      accepted={availability.status === "accepted"}
    />
  );
}
