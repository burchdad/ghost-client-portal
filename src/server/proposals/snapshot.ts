import type { ProposalWithPublicRelations, AcceptanceSnapshot } from "./types";

export function createProposalSnapshot(
  proposal: ProposalWithPublicRelations,
  signatory: AcceptanceSnapshot["signatory"],
  acceptedAt: Date,
): AcceptanceSnapshot {
  return {
    ghostIdentity: "Ghost AI Solutions",
    clientOrganization: proposal.organization.name,
    proposalTitle: proposal.title,
    proposalNumber: proposal.proposalNumber,
    proposalVersion: proposal.version,
    proposalVersionLabel: proposal.versionLabel,
    executiveSummary: proposal.executiveSummary,
    objectives: proposal.objectives,
    scopeOfWork: proposal.scopeOfWork,
    deliverables: proposal.deliverables
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((deliverable) => deliverable.name),
    exclusions: proposal.exclusions,
    timeline: proposal.timeline,
    totalCents: proposal.totalCents,
    currency: proposal.currency,
    paymentSchedule: proposal.paymentSchedule
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => ({
        label: item.label,
        amountCents: item.amountCents,
        paymentType: item.paymentType,
      })),
    terms: proposal.terms,
    selectedAddOns: proposal.addOns
      .filter((addOn) => addOn.accepted)
      .map((addOn) => ({ name: addOn.name, priceCents: addOn.priceCents })),
    signatory,
    acceptedAt: acceptedAt.toISOString(),
  };
}

export function proposalContentForHash(snapshot: AcceptanceSnapshot) {
  const proposalContent = { ...snapshot } as Partial<AcceptanceSnapshot>;
  delete proposalContent.signatory;
  delete proposalContent.acceptedAt;

  return proposalContent;
}
