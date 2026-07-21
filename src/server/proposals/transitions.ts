import type { Prisma, PrismaClient, ProposalStatus } from "@prisma/client";
import { assertProposalTransition, canTransitionProposal } from "@/lib/proposals";

export async function transitionProposalStatus(
  tx: Prisma.TransactionClient | PrismaClient,
  input: {
    proposalId: string;
    organizationId: string;
    from: ProposalStatus;
    to: ProposalStatus;
    actorUserId?: string | null;
    actorLabel: string;
    now?: Date;
    idempotent?: boolean;
  },
) {
  const now = input.now ?? new Date();

  if (input.from === input.to && input.idempotent) {
    return null;
  }

  assertProposalTransition(input.from, input.to);

  const proposal = await tx.proposal.update({
    where: { id: input.proposalId },
    data: {
      status: input.to,
      viewedAt: input.to === "VIEWED" ? now : undefined,
      acceptedAt: input.to === "PAYMENT_PENDING" ? now : undefined,
      signedAt: input.to === "PAYMENT_PENDING" ? now : undefined,
    },
  });

  await Promise.all([
    tx.activityEvent.create({
      data: {
        organizationId: input.organizationId,
        type: `proposal.${input.to.toLowerCase()}`,
        title: `Proposal ${input.to.replaceAll("_", " ").toLowerCase()}`,
        body: proposal.title,
      },
    }),
    tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        eventType: "proposal.status_changed",
        entityType: "Proposal",
        entityId: input.proposalId,
        metadata: {
          from: input.from,
          to: input.to,
          actor: input.actorLabel,
          changedAt: now.toISOString(),
        },
      },
    }),
    tx.outboxEvent.create({
      data: {
        eventType: `proposal.${input.to.toLowerCase()}`,
        aggregateType: "Proposal",
        aggregateId: input.proposalId,
        payload: { proposalId: input.proposalId, from: input.from, to: input.to },
      },
    }),
  ]);

  return proposal;
}

export function canAdvanceToViewed(status: ProposalStatus) {
  return status === "SENT" || status === "VIEWED";
}

export function canAcceptProposalStatus(status: ProposalStatus) {
  return status === "VIEWED" || status === "SENT" || status === "APPROVED" || status === "SIGNATURE_PENDING";
}

export { canTransitionProposal };
