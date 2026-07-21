import type { ProposalStatus } from "@prisma/client";

const allowedTransitions: Record<ProposalStatus, ProposalStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["VIEWED", "DECLINED", "EXPIRED"],
  VIEWED: ["QUESTIONS_SUBMITTED", "APPROVED", "DECLINED", "EXPIRED"],
  QUESTIONS_SUBMITTED: ["APPROVED", "DECLINED"],
  APPROVED: ["SIGNATURE_PENDING"],
  SIGNATURE_PENDING: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["DEPOSIT_PAID", "ACTIVE", "CANCELLED"],
  DEPOSIT_PAID: ["ACTIVE"],
  ACTIVE: ["CANCELLED"],
  DECLINED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function canTransitionProposal(
  from: ProposalStatus,
  to: ProposalStatus,
) {
  return allowedTransitions[from].includes(to);
}

export function assertProposalTransition(
  from: ProposalStatus,
  to: ProposalStatus,
) {
  if (!canTransitionProposal(from, to)) {
    throw new Error(`Proposal cannot transition from ${from} to ${to}.`);
  }
}
