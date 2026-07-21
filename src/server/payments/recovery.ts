import type { Payment, PrismaClient } from "@prisma/client";
import type Stripe from "stripe";
import { getDb } from "@/lib/db";
import { activateProjectForDeposit } from "@/server/projects/activation";
import { transitionProposalStatus } from "@/server/proposals/transitions";
import { assertStripeLivemodeMatchesEnvironment } from "@/server/env";
import { parseCheckoutMetadata } from "@/server/payments/metadata";
import { getStripeClient } from "@/server/stripe/client";
import { getStripeServerConfig } from "@/server/stripe/config";

export async function retryPaymentActivation(input: {
  paymentId: string;
  actorUserId: string;
  db?: PrismaClient;
}) {
  const db = input.db ?? getDb();
  const paymentForVerification = await db.payment.findUniqueOrThrow({
    where: { id: input.paymentId },
    include: { paymentScheduleItem: true },
  });
  const intentId = paymentForVerification.stripePaymentIntentId;

  if (!intentId) {
    throw new Error(
      "Verified Stripe PaymentIntent is required before retrying internal activation.",
    );
  }

  const config = getStripeServerConfig();
  if (!config.configured) {
    throw new Error(
      "Stripe must be configured before retrying payment activation.",
    );
  }

  const intent = await getStripeClient().paymentIntents.retrieve(intentId);
  assertStripeLivemodeMatchesEnvironment(
    Boolean(intent.livemode),
    config.environment,
  );
  validateRecoveryStripeIntent(paymentForVerification, intent);

  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
      include: { proposal: true },
    });

    if (payment.status !== "PAID") {
      throw new Error(
        "Only confirmed paid payments can retry fulfillment activation.",
      );
    }

    if (!payment.proposal) {
      throw new Error("Payment is not linked to a proposal.");
    }

    const proposal =
      payment.proposal.status === "PAYMENT_PENDING"
        ? await transitionProposalStatus(tx, {
            proposalId: payment.proposal.id,
            organizationId: payment.organizationId,
            from: "PAYMENT_PENDING",
            to: "DEPOSIT_PAID",
            actorUserId: input.actorUserId,
            actorLabel: "payment_recovery",
          })
        : payment.proposal;

    if (!proposal) {
      throw new Error("Proposal status transition failed during recovery.");
    }

    const project = await activateProjectForDeposit(tx, { proposal, payment });

    if (proposal.status === "DEPOSIT_PAID") {
      await transitionProposalStatus(tx, {
        proposalId: proposal.id,
        organizationId: payment.organizationId,
        from: "DEPOSIT_PAID",
        to: "ACTIVE",
        actorUserId: input.actorUserId,
        actorLabel: "payment_recovery",
      });
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        projectId: project.id,
        recoveryRequired: false,
        recoveryReason: null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: "payment.activation_retried",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { projectId: project.id },
      },
    });

    return project;
  });
}

export function validateRecoveryStripeIntent(
  payment: Payment & { paymentScheduleItem?: { id: string } | null },
  intent: Pick<
    Stripe.PaymentIntent,
    "id" | "status" | "amount_received" | "amount" | "currency" | "metadata"
  >,
) {
  if (intent.id !== payment.stripePaymentIntentId) {
    throw new Error(
      "Stripe PaymentIntent does not match the internal payment record.",
    );
  }

  if (intent.status !== "succeeded") {
    throw new Error("Stripe PaymentIntent is not succeeded.");
  }

  const amountReceived = intent.amount_received || intent.amount;
  if (amountReceived !== payment.amountCents) {
    throw new Error(
      "Stripe PaymentIntent amount does not match the internal payment record.",
    );
  }

  if (intent.currency?.toLowerCase() !== payment.currency.toLowerCase()) {
    throw new Error(
      "Stripe PaymentIntent currency does not match the internal payment record.",
    );
  }

  const metadata = parseCheckoutMetadata(intent.metadata);
  if (metadata.internalPaymentId !== payment.id) {
    throw new Error(
      "Stripe metadata payment does not match the internal payment record.",
    );
  }

  if (metadata.organizationId !== payment.organizationId) {
    throw new Error(
      "Stripe metadata organization does not match the internal payment record.",
    );
  }

  if (metadata.proposalId !== payment.proposalId) {
    throw new Error(
      "Stripe metadata proposal does not match the internal payment record.",
    );
  }

  if (
    payment.paymentScheduleItem?.id &&
    metadata.paymentScheduleItemId !== payment.paymentScheduleItem.id
  ) {
    throw new Error(
      "Stripe metadata schedule item does not match the internal payment record.",
    );
  }
}
