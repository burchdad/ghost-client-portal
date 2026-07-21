import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { detectPlaceholders } from "@/server/placeholders";

export const INVALIDATE_SEEDED_ACCEPTANCE_CONFIRMATION =
  "INVALIDATE SEEDED ACCEPTANCE";
export const MARK_CHECKOUT_ABANDONED_CONFIRMATION = "MARK CHECKOUT ABANDONED";

export function assertLaunchReviewChecklist(
  checklist: Record<string, boolean>,
) {
  const required = [
    "contactVerified",
    "emailVerified",
    "scopeVerified",
    "deliverablesVerified",
    "paymentScheduleVerified",
    "termsVerified",
    "expirationVerified",
    "stripeModeVerified",
    "existingCheckoutSessionReviewed",
    "tokenRotated",
    "noPlaceholdersRemain",
    "noLifecycleInconsistenciesRemain",
  ];

  return {
    missing: required.filter((key) => !checklist[key]),
    finalStatus: required.every((key) => checklist[key])
      ? ("GO" as const)
      : ("NO-GO" as const),
  };
}

export async function invalidateSeededAcceptance(input: {
  proposalId: string;
  actorUserId: string;
  actorLabel: string;
  reason: string;
  confirmation: string;
  db?: PrismaClient;
}) {
  if (input.confirmation !== INVALIDATE_SEEDED_ACCEPTANCE_CONFIRMATION) {
    throw new Error(
      "Seeded acceptance invalidation requires explicit confirmation.",
    );
  }

  if (input.reason.trim().length < 12) {
    throw new Error("A detailed invalidation reason is required.");
  }

  const db = input.db ?? getDb();
  return db.$transaction(async (tx) => {
    const proposal = await tx.proposal.findUniqueOrThrow({
      where: { id: input.proposalId },
      include: {
        acceptances: true,
        payments: true,
        organization: { include: { contacts: true } },
      },
    });

    if (
      proposal.payments.some(
        (payment) => payment.status === "PAID" || payment.stripePaymentIntentId,
      )
    ) {
      throw new Error(
        "Seeded acceptance cannot be invalidated after a confirmed payment or PaymentIntent exists.",
      );
    }

    const activeAcceptances = proposal.acceptances.filter(
      (acceptance) => !acceptance.invalidatedAt,
    );
    if (!activeAcceptances.length) {
      return proposal;
    }

    const placeholderEvidence = detectPlaceholders({
      acceptedName: activeAcceptances[0]?.signerName,
      acceptedTitle: activeAcceptances[0]?.signerTitle,
      acceptedEmail: activeAcceptances[0]?.signerEmail,
    });
    if (!placeholderEvidence.length) {
      throw new Error(
        "Acceptance is not clearly marked by known placeholder values.",
      );
    }

    const before = {
      status: proposal.status,
      acceptedAt: proposal.acceptedAt,
      signedAt: proposal.signedAt,
      viewedAt: proposal.viewedAt,
      activeAcceptanceIds: activeAcceptances.map((acceptance) => acceptance.id),
    };

    await tx.proposalAcceptance.updateMany({
      where: { proposalId: proposal.id, invalidatedAt: null },
      data: {
        invalidatedAt: new Date(),
        invalidatedById: input.actorUserId,
        invalidationReason: input.reason.trim(),
        invalidationType: "SEEDED_TEST_RECORD",
      },
    });

    const updated = await tx.proposal.update({
      where: { id: proposal.id },
      data: {
        status: "SENT",
        acceptedAt: null,
        signedAt: null,
        paidAt: null,
        viewedAt: null,
        lastViewedAt: null,
        viewCount: 0,
      },
    });

    await tx.paymentScheduleItem.updateMany({
      where: { proposalId: proposal.id, status: { not: "PAID" } },
      data: { status: "PENDING", stripePaymentIntentId: null },
    });

    await tx.activityEvent.create({
      data: {
        organizationId: proposal.organizationId,
        type: "proposal.seed_acceptance_invalidated",
        title: "Seeded acceptance invalidated",
        body: "Proposal returned to client-review state for real acceptance.",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: "proposal.seed_acceptance_invalidated",
        entityType: "Proposal",
        entityId: proposal.id,
        metadata: {
          reason: input.reason.trim(),
          before,
          after: {
            status: updated.status,
            acceptedAt: updated.acceptedAt,
            signedAt: updated.signedAt,
            viewedAt: updated.viewedAt,
          },
          confirmation: "recorded",
          correlationId: crypto.randomUUID(),
        },
      },
    });

    return updated;
  });
}

export async function markCheckoutSessionAbandoned(input: {
  paymentId: string;
  actorUserId: string;
  reason: string;
  confirmation: string;
  db?: PrismaClient;
}) {
  if (input.confirmation !== MARK_CHECKOUT_ABANDONED_CONFIRMATION) {
    throw new Error("Checkout disposition requires explicit confirmation.");
  }

  if (input.reason.trim().length < 12) {
    throw new Error("A disposition reason is required.");
  }

  const db = input.db ?? getDb();
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
      include: { proposal: true },
    });

    if (payment.status === "PAID" || payment.stripePaymentIntentId) {
      throw new Error(
        "Confirmed or intent-linked payments cannot be marked abandoned by this action.",
      );
    }

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        checkoutDisposition: "ABANDONED",
        checkoutDispositionAt: new Date(),
        checkoutDispositionById: input.actorUserId,
        checkoutDispositionReason: input.reason.trim(),
      },
    });

    if (payment.paymentScheduleItemId) {
      await tx.paymentScheduleItem.updateMany({
        where: { id: payment.paymentScheduleItemId, status: { not: "PAID" } },
        data: { status: "PENDING", stripePaymentIntentId: null },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: "payment.checkout_abandoned",
        entityType: "Payment",
        entityId: payment.id,
        metadata: {
          proposalId: payment.proposalId,
          status: payment.status,
          disposition: "ABANDONED",
          reason: input.reason.trim(),
          correlationId: crypto.randomUUID(),
        },
      },
    });

    return updated;
  });
}

export async function recordLaunchReview(input: {
  organizationId: string;
  proposalId?: string | null;
  actorUserId: string;
  actorLabel: string;
  reason: string;
  checklist: Record<string, boolean>;
  report: Record<string, unknown>;
  db?: PrismaClient;
}) {
  const readiness = assertLaunchReviewChecklist(input.checklist);
  const db = input.db ?? getDb();

  return db.$transaction(async (tx) => {
    const review = await tx.launchReview.create({
      data: {
        organizationId: input.organizationId,
        proposalId: input.proposalId ?? null,
        finalStatus: readiness.finalStatus,
        checklist: input.checklist,
        report: { ...input.report, missing: readiness.missing },
        operatorUserId: input.actorUserId,
        operatorLabel: input.actorLabel,
        reason: input.reason,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: "launch.review_recorded",
        entityType: "LaunchReview",
        entityId: review.id,
        metadata: {
          organizationId: input.organizationId,
          proposalId: input.proposalId ?? null,
          finalStatus: readiness.finalStatus,
          missing: readiness.missing,
          correlationId: crypto.randomUUID(),
        },
      },
    });

    return review;
  });
}
