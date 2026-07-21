import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { canAdvanceToViewed, transitionProposalStatus } from "./transitions";

export async function trackProposalView(proposalId: string, db: PrismaClient = getDb()) {
  try {
    await db.$transaction(async (tx) => {
      const proposal = await tx.proposal.findUnique({ where: { id: proposalId } });

      if (!proposal || !proposal.isPublic || proposal.deletedAt) {
        return;
      }

      const now = new Date();
      const firstView = !proposal.viewedAt;
      const nextStatus = proposal.status === "SENT" ? "VIEWED" : proposal.status;

      await tx.proposal.update({
        where: { id: proposalId },
        data: {
          viewedAt: firstView ? now : undefined,
          lastViewedAt: now,
          viewCount: { increment: 1 },
          status: nextStatus,
        },
      });

      if (firstView && canAdvanceToViewed(proposal.status)) {
        await Promise.all([
          tx.activityEvent.create({
            data: {
              organizationId: proposal.organizationId,
              type: "proposal.viewed",
              title: "Proposal viewed",
              body: proposal.title,
            },
          }),
          tx.auditLog.create({
            data: {
              eventType: "proposal.viewed",
              entityType: "Proposal",
              entityId: proposal.id,
              metadata: { firstView: true, viewedAt: now.toISOString() },
            },
          }),
          tx.outboxEvent.create({
            data: {
              eventType: "proposal.viewed",
              aggregateType: "Proposal",
              aggregateId: proposal.id,
              payload: { proposalId: proposal.id, viewedAt: now.toISOString() },
            },
          }),
        ]);
      }
    });
  } catch (error) {
    console.error("Proposal view tracking failed", {
      proposalId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export { transitionProposalStatus };
