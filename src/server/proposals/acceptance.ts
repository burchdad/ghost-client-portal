import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { hashCanonical } from "./hashing";
import { getPublicProposalAvailability } from "./repository";
import { createProposalSnapshot, proposalContentForHash } from "./snapshot";
import { isTokenExpired, isTokenRevoked } from "./tokens";
import {
  canAcceptProposalStatus,
  transitionProposalStatus,
} from "./transitions";
import type { AcceptanceInput } from "./validation";

export type AcceptanceResult =
  | { status: "accepted"; token: string }
  | { status: "duplicate"; token: string }
  | { status: "unavailable"; correlationId: string }
  | { status: "invalid-status"; correlationId: string };

export async function acceptProposal(
  input: AcceptanceInput,
  metadata: {
    requestId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
  db: PrismaClient = getDb(),
): Promise<AcceptanceResult> {
  const availability = await getPublicProposalAvailability(input.token, { db });

  if (
    availability.status === "unavailable" ||
    availability.status === "expired"
  ) {
    return { status: "unavailable", correlationId: availability.correlationId };
  }

  const proposal = availability.proposal;

  if (availability.status === "accepted") {
    return { status: "duplicate", token: input.token };
  }

  if (
    !canAcceptProposalStatus(proposal.status) ||
    isTokenExpired(proposal) ||
    isTokenRevoked(proposal)
  ) {
    return { status: "invalid-status", correlationId: crypto.randomUUID() };
  }

  return db.$transaction(async (tx) => {
    const fresh = await tx.proposal.findUnique({
      where: { id: proposal.id },
      include: {
        organization: true,
        sections: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } },
        deliverables: { orderBy: { sortOrder: "asc" } },
        addOns: true,
        paymentSchedule: { orderBy: { sortOrder: "asc" } },
        acceptances: {
          where: {
            OR: [
              { idempotencyKey: input.idempotencyKey },
              { proposalVersion: proposal.version },
            ],
          },
        },
      },
    });

    if (
      !fresh ||
      !fresh.isPublic ||
      fresh.deletedAt ||
      !canAcceptProposalStatus(fresh.status)
    ) {
      return { status: "invalid-status", correlationId: crypto.randomUUID() };
    }

    if (fresh.acceptances.length > 0) {
      return { status: "duplicate", token: input.token };
    }

    const acceptedAt = new Date();
    const signatory = {
      fullName: input.signerName,
      title: input.signerTitle,
      email: input.signerEmail.toLowerCase(),
      typedSignature: input.typedSignature,
      note: input.note || undefined,
      purchaseOrderNumber: input.purchaseOrderNumber || undefined,
    };
    const snapshot = createProposalSnapshot(fresh, signatory, acceptedAt);
    const proposalContentHash = hashCanonical(proposalContentForHash(snapshot));
    const acceptancePayloadHash = hashCanonical({
      proposalId: fresh.id,
      proposalVersion: fresh.version,
      signatory,
      confirmations: {
        authorizedApproval: true,
        reviewedScope: true,
        acceptedPaymentSchedule: true,
        acceptedTerms: true,
      },
      acceptedAt: acceptedAt.toISOString(),
    });
    const acceptanceHash = hashCanonical({
      proposalContentHash,
      acceptancePayloadHash,
    });

    await tx.proposalAcceptance.create({
      data: {
        proposalId: fresh.id,
        organizationId: fresh.organizationId,
        signerName: input.signerName,
        signerTitle: input.signerTitle,
        signerEmail: input.signerEmail.toLowerCase(),
        typedSignature: input.typedSignature,
        authorizedApproval: true,
        reviewedScope: true,
        acceptedPaymentSchedule: true,
        acceptedTerms: true,
        note: input.note,
        purchaseOrderNumber: input.purchaseOrderNumber,
        proposalVersion: fresh.version,
        proposalVersionLabel: fresh.versionLabel,
        proposalSnapshot: snapshot,
        proposalContentHash,
        acceptancePayloadHash,
        acceptanceHash,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        requestId: metadata.requestId,
        idempotencyKey: input.idempotencyKey,
        acceptedAt,
      },
    });

    await transitionProposalStatus(tx, {
      proposalId: fresh.id,
      organizationId: fresh.organizationId,
      from: fresh.status,
      to: fresh.status === "SENT" ? "VIEWED" : fresh.status,
      actorLabel: "public_proposal_link",
      idempotent: true,
    });

    const viewedStatus = fresh.status === "SENT" ? "VIEWED" : fresh.status;
    if (viewedStatus === "VIEWED") {
      await transitionProposalStatus(tx, {
        proposalId: fresh.id,
        organizationId: fresh.organizationId,
        from: "VIEWED",
        to: "APPROVED",
        actorLabel: "public_proposal_link",
      });
      await transitionProposalStatus(tx, {
        proposalId: fresh.id,
        organizationId: fresh.organizationId,
        from: "APPROVED",
        to: "SIGNATURE_PENDING",
        actorLabel: "public_proposal_link",
      });
      await transitionProposalStatus(tx, {
        proposalId: fresh.id,
        organizationId: fresh.organizationId,
        from: "SIGNATURE_PENDING",
        to: "PAYMENT_PENDING",
        actorLabel: "public_proposal_link",
      });
    } else if (viewedStatus === "APPROVED") {
      await transitionProposalStatus(tx, {
        proposalId: fresh.id,
        organizationId: fresh.organizationId,
        from: "APPROVED",
        to: "SIGNATURE_PENDING",
        actorLabel: "public_proposal_link",
      });
      await transitionProposalStatus(tx, {
        proposalId: fresh.id,
        organizationId: fresh.organizationId,
        from: "SIGNATURE_PENDING",
        to: "PAYMENT_PENDING",
        actorLabel: "public_proposal_link",
      });
    } else if (viewedStatus === "SIGNATURE_PENDING") {
      await transitionProposalStatus(tx, {
        proposalId: fresh.id,
        organizationId: fresh.organizationId,
        from: "SIGNATURE_PENDING",
        to: "PAYMENT_PENDING",
        actorLabel: "public_proposal_link",
      });
    }

    await Promise.all([
      tx.activityEvent.create({
        data: {
          organizationId: fresh.organizationId,
          type: "proposal.accepted",
          title: "Proposal accepted",
          body: `${fresh.title} accepted by ${input.signerName}.`,
        },
      }),
      tx.auditLog.create({
        data: {
          eventType: "proposal.acceptance_recorded",
          entityType: "Proposal",
          entityId: fresh.id,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          metadata: {
            requestId: metadata.requestId,
            proposalVersion: fresh.version,
          },
        },
      }),
      tx.notification.create({
        data: {
          organizationId: fresh.organizationId,
          type: "proposal.accepted",
          title: "Proposal accepted",
          body: `${fresh.organization.name} accepted ${fresh.title}.`,
          linkTarget: `/admin/proposals/${fresh.id}`,
        },
      }),
      tx.outboxEvent.create({
        data: {
          eventType: "proposal.accepted",
          aggregateType: "Proposal",
          aggregateId: fresh.id,
          payload: { proposalId: fresh.id, proposalVersion: fresh.version },
        },
      }),
      tx.outboxEvent.create({
        data: {
          eventType: "proposal.signed",
          aggregateType: "Proposal",
          aggregateId: fresh.id,
          payload: { proposalId: fresh.id, proposalVersion: fresh.version },
        },
      }),
      tx.outboxEvent.create({
        data: {
          eventType: "proposal.payment_pending",
          aggregateType: "Proposal",
          aggregateId: fresh.id,
          payload: { proposalId: fresh.id, proposalVersion: fresh.version },
        },
      }),
    ]);

    return { status: "accepted", token: input.token };
  });
}
