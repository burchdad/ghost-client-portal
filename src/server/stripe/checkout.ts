import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getProposalPaymentContextByToken } from "@/server/payments/repository";
import { evaluateDepositPaymentEligibility } from "@/server/payments/eligibility";
import { createCheckoutMetadata } from "@/server/payments/metadata";
import { getSafeRequestMetadata } from "@/server/security/request";
import { validateRuntimeEnvironment } from "@/server/env";
import { getStripeServerConfig } from "./config";
import { getStripeClient } from "./client";
import { getOrCreateStripeCustomer } from "./customers";
import { stripeIdempotencyKey } from "./ids";

export type CheckoutCreationResult =
  | { status: "created"; url: string }
  | { status: "reused"; url: string }
  | { status: "already-paid"; redirectTo: string }
  | { status: "unavailable"; reason: string; correlationId: string };

export async function createPaymentScheduleCheckoutSession(
  input: {
    organizationId: string;
    paymentScheduleItemId: string;
    actorUserId?: string;
  },
  db: PrismaClient = getDb(),
): Promise<CheckoutCreationResult> {
  const config = getStripeServerConfig();

  if (!config.configured) {
    return {
      status: "unavailable",
      reason: "stripe-not-configured",
      correlationId: crypto.randomUUID(),
    };
  }

  const runtime = validateRuntimeEnvironment({
    environment: config.environment,
  });
  if (runtime.status === "BLOCKED") {
    return {
      status: "unavailable",
      reason: "environment-not-ready",
      correlationId: crypto.randomUUID(),
    };
  }

  const requestMetadata = await getSafeRequestMetadata();
  const item = await db.paymentScheduleItem.findFirst({
    where: {
      id: input.paymentScheduleItemId,
      organizationId: input.organizationId,
      proposal: { deletedAt: null },
    },
    include: {
      project: true,
      proposal: {
        include: {
          acceptances: {
            where: { invalidatedAt: null },
            orderBy: { acceptedAt: "desc" },
            take: 1,
          },
          organization: {
            include: { contacts: { where: { isPrimary: true }, take: 1 } },
          },
          projects: {
            where: { deletedAt: null },
            take: 1,
          },
        },
      },
    },
  });

  if (!item) {
    return {
      status: "unavailable",
      reason: "payment-schedule-item-not-found",
      correlationId: crypto.randomUUID(),
    };
  }

  if (item.status === "PAID") {
    return { status: "already-paid", redirectTo: "/payments?notice=paid" };
  }

  if (item.status === "WAIVED" || item.amountCents <= 0) {
    return {
      status: "unavailable",
      reason: "payment-not-collectible",
      correlationId: crypto.randomUUID(),
    };
  }

  if (["DECLINED", "EXPIRED", "CANCELLED"].includes(item.proposal.status)) {
    return {
      status: "unavailable",
      reason: "proposal-not-payable",
      correlationId: crypto.randomUUID(),
    };
  }

  const acceptance = item.proposal.acceptances[0];
  if (!acceptance) {
    return {
      status: "unavailable",
      reason: "proposal-acceptance-required",
      correlationId: crypto.randomUUID(),
    };
  }

  if (item.proposal.isTestRecord && config.environment === "production") {
    return {
      status: "unavailable",
      reason: "live-test-checkout-confirmation-required",
      correlationId: crypto.randomUUID(),
    };
  }

  const existingPayment = await db.payment.findFirst({
    where: {
      paymentScheduleItemId: item.id,
      status: { in: ["CHECKOUT_CREATED", "PROCESSING", "PAID"] },
    },
    orderBy: { createdAt: "desc" },
  });

  const existingUrl =
    existingPayment?.metadata &&
    typeof existingPayment.metadata === "object" &&
    "checkoutUrl" in existingPayment.metadata &&
    typeof existingPayment.metadata.checkoutUrl === "string"
      ? existingPayment.metadata.checkoutUrl
      : null;

  if (existingPayment?.status === "PAID") {
    return { status: "already-paid", redirectTo: "/payments?notice=paid" };
  }

  if (existingPayment?.stripeCheckoutId && existingUrl) {
    return { status: "reused", url: existingUrl };
  }

  const customerId = await getOrCreateStripeCustomer(item.organizationId, db);
  const projectId = item.projectId ?? item.proposal.projects[0]?.id;
  const internalPayment = await db.$transaction(async (tx) => {
    if (existingPayment) {
      return existingPayment;
    }

    const payment = await tx.payment.create({
      data: {
        organizationId: item.organizationId,
        proposalId: item.proposalId,
        projectId,
        paymentScheduleItemId: item.id,
        paymentType: item.paymentType,
        isTestRecord: item.proposal.isTestRecord,
        testRunId: item.proposal.testRunId,
        status: "PENDING",
        amountCents: item.amountCents,
        currency: item.currency,
        stripeCustomerId: customerId,
        idempotencyKey: stripeIdempotencyKey(["payment", "schedule", item.id]),
        requestId: requestMetadata.requestId,
        metadata: {
          proposalNumber: item.proposal.proposalNumber,
          scheduleLabel: item.label,
        },
      },
    });

    await tx.paymentScheduleItem.update({
      where: { id: item.id },
      data: { status: "PROCESSING" },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: "payment.checkout_prepared",
        entityType: "Payment",
        entityId: payment.id,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: { paymentScheduleItemId: item.id },
      },
    });

    return payment;
  });

  const stripe = getStripeClient();
  const checkoutMetadata = createCheckoutMetadata({
    organizationId: item.organizationId,
    proposalId: item.proposalId,
    proposalNumber: item.proposal.proposalNumber,
    proposalAcceptanceId: acceptance.id,
    paymentScheduleItemId: item.id,
    internalPaymentId: internalPayment.id,
    paymentType: item.paymentType,
    projectId,
    environment: config.environment,
    requestId: requestMetadata.requestId,
  });

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer: customerId,
      client_reference_id: internalPayment.id,
      billing_address_collection: "auto",
      allow_promotion_codes: false,
      automatic_tax: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: item.currency,
            unit_amount: item.amountCents,
            product_data: {
              name: `${item.proposal.title} - ${item.label}`,
              metadata: { proposalNumber: item.proposal.proposalNumber },
            },
          },
        },
      ],
      metadata: checkoutMetadata,
      payment_intent_data: { metadata: checkoutMetadata },
      success_url: `${config.appUrl}/payments?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/payments?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    },
    {
      idempotencyKey: stripeIdempotencyKey([
        "checkout",
        "schedule",
        item.id,
        internalPayment.id,
      ]),
    },
  );

  const checkoutUrl = session.url;
  if (!checkoutUrl) {
    await db.payment.update({
      where: { id: internalPayment.id },
      data: {
        status: "RECOVERY_REQUIRED",
        recoveryRequired: true,
        recoveryReason: "Stripe session did not return a URL.",
      },
    });
    return {
      status: "unavailable",
      reason: "checkout-url-missing",
      correlationId: crypto.randomUUID(),
    };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: internalPayment.id },
      data: {
        status: "CHECKOUT_CREATED",
        stripeCheckoutId: session.id,
        stripeCustomerId: customerId,
        metadata: {
          checkoutUrl,
          proposalNumber: item.proposal.proposalNumber,
          scheduleLabel: item.label,
        },
      },
    });
    await tx.paymentScheduleItem.update({
      where: { id: item.id },
      data: { status: "CHECKOUT_CREATED", stripeCheckoutId: session.id },
    });
    await tx.activityEvent.create({
      data: {
        organizationId: item.organizationId,
        type: "payment.checkout_created",
        title: "Checkout created",
        body: `${item.label} - ${item.proposal.title}`,
      },
    });
    await tx.outboxEvent.create({
      data: {
        eventType: "payment.checkout_created",
        aggregateType: "Payment",
        aggregateId: internalPayment.id,
        payload: { paymentScheduleItemId: item.id },
      },
    });
  });

  return { status: "created", url: checkoutUrl };
}

export async function createProposalPaymentCheckoutSession(
  token: string,
  db: PrismaClient = getDb(),
  options: { liveTestConfirmation?: string } = {},
): Promise<CheckoutCreationResult> {
  const config = getStripeServerConfig();

  if (!config.configured) {
    return {
      status: "unavailable",
      reason: "stripe-not-configured",
      correlationId: crypto.randomUUID(),
    };
  }

  const runtime = validateRuntimeEnvironment({
    environment: config.environment,
  });
  if (runtime.status === "BLOCKED") {
    return {
      status: "unavailable",
      reason: "environment-not-ready",
      correlationId: crypto.randomUUID(),
    };
  }

  const requestMetadata = await getSafeRequestMetadata();
  const proposal = await getProposalPaymentContextByToken(token, db).catch(
    () => null,
  );
  const eligibility = evaluateDepositPaymentEligibility(proposal);

  if (!eligibility.eligible) {
    if (eligibility.reason === "already-paid") {
      return {
        status: "already-paid",
        redirectTo: `/p/${token}/payment/success`,
      };
    }

    return {
      status: "unavailable",
      reason: eligibility.reason,
      correlationId: eligibility.correlationId,
    };
  }

  if (
    eligibility.proposal.isTestRecord &&
    config.environment === "production" &&
    options.liveTestConfirmation !== "CREATE UNPAID LIVE TEST CHECKOUT"
  ) {
    return {
      status: "unavailable",
      reason: "live-test-checkout-confirmation-required",
      correlationId: crypto.randomUUID(),
    };
  }

  const existingUrl =
    eligibility.existingPayment?.metadata &&
    typeof eligibility.existingPayment.metadata === "object" &&
    "checkoutUrl" in eligibility.existingPayment.metadata &&
    typeof eligibility.existingPayment.metadata.checkoutUrl === "string"
      ? eligibility.existingPayment.metadata.checkoutUrl
      : null;

  if (eligibility.existingPayment?.stripeCheckoutId && existingUrl) {
    return { status: "reused", url: existingUrl };
  }

  const customerId = await getOrCreateStripeCustomer(
    eligibility.proposal.organizationId,
    db,
  );
  const internalPayment = await db.$transaction(async (tx) => {
    const existing = await tx.payment.findFirst({
      where: {
        paymentScheduleItemId: eligibility.depositItem.id,
        status: { in: ["CHECKOUT_CREATED", "PROCESSING", "PAID"] },
      },
    });

    if (existing) {
      return existing;
    }

    const payment = await tx.payment.create({
      data: {
        organizationId: eligibility.proposal.organizationId,
        proposalId: eligibility.proposal.id,
        projectId: eligibility.proposal.projects[0]?.id,
        paymentScheduleItemId: eligibility.depositItem.id,
        paymentType: "DEPOSIT",
        isTestRecord: eligibility.proposal.isTestRecord,
        testRunId: eligibility.proposal.testRunId,
        status: "PENDING",
        amountCents: eligibility.depositItem.amountCents,
        currency: eligibility.depositItem.currency,
        stripeCustomerId: customerId,
        idempotencyKey: stripeIdempotencyKey([
          "payment",
          "deposit",
          eligibility.depositItem.id,
        ]),
        requestId: requestMetadata.requestId,
        metadata: { proposalNumber: eligibility.proposal.proposalNumber },
      },
    });

    await tx.paymentScheduleItem.update({
      where: { id: eligibility.depositItem.id },
      data: { status: "PROCESSING" },
    });

    await tx.auditLog.create({
      data: {
        eventType: "payment.checkout_prepared",
        entityType: "Payment",
        entityId: payment.id,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
        metadata: { paymentScheduleItemId: eligibility.depositItem.id },
      },
    });

    return payment;
  });

  if (internalPayment.status === "PAID") {
    return {
      status: "already-paid",
      redirectTo: `/p/${token}/payment/success`,
    };
  }

  const stripe = getStripeClient();
  const checkoutMetadata = createCheckoutMetadata({
    organizationId: eligibility.proposal.organizationId,
    proposalId: eligibility.proposal.id,
    proposalNumber: eligibility.proposal.proposalNumber,
    proposalAcceptanceId: eligibility.acceptance.id,
    paymentScheduleItemId: eligibility.depositItem.id,
    internalPaymentId: internalPayment.id,
    paymentType: "DEPOSIT",
    projectId: eligibility.proposal.projects[0]?.id,
    environment: config.environment,
    requestId: requestMetadata.requestId,
  });

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer: customerId,
      customer_email: customerId
        ? undefined
        : eligibility.proposal.organization.contacts[0]?.email,
      client_reference_id: internalPayment.id,
      billing_address_collection: "auto",
      allow_promotion_codes: false,
      automatic_tax: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: eligibility.depositItem.currency,
            unit_amount: eligibility.depositItem.amountCents,
            product_data: {
              name: `${eligibility.proposal.title} - ${eligibility.depositItem.label}`,
              metadata: { proposalNumber: eligibility.proposal.proposalNumber },
            },
          },
        },
      ],
      metadata: checkoutMetadata,
      payment_intent_data: { metadata: checkoutMetadata },
      success_url: `${config.appUrl}/p/${token}/payment/success`,
      cancel_url: `${config.appUrl}/p/${token}/payment/cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
    },
    {
      idempotencyKey: stripeIdempotencyKey([
        "checkout",
        "create",
        eligibility.depositItem.id,
        internalPayment.id,
      ]),
    },
  );

  const checkoutUrl = session.url;
  if (!checkoutUrl) {
    await db.payment.update({
      where: { id: internalPayment.id },
      data: {
        status: "RECOVERY_REQUIRED",
        recoveryRequired: true,
        recoveryReason: "Stripe session did not return a URL.",
      },
    });
    return {
      status: "unavailable",
      reason: "checkout-url-missing",
      correlationId: crypto.randomUUID(),
    };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: internalPayment.id },
      data: {
        status: "CHECKOUT_CREATED",
        stripeCheckoutId: session.id,
        metadata: {
          checkoutUrl,
          proposalNumber: eligibility.proposal.proposalNumber,
        },
      },
    });
    await tx.paymentScheduleItem.update({
      where: { id: eligibility.depositItem.id },
      data: { status: "CHECKOUT_CREATED", stripeCheckoutId: session.id },
    });
    await tx.activityEvent.create({
      data: {
        organizationId: eligibility.proposal.organizationId,
        type: "payment.checkout_created",
        title: "Deposit checkout created",
        body: eligibility.depositItem.label,
      },
    });
    await tx.outboxEvent.create({
      data: {
        eventType: "payment.checkout_created",
        aggregateType: "Payment",
        aggregateId: internalPayment.id,
        payload: { paymentScheduleItemId: eligibility.depositItem.id },
      },
    });
  });

  return { status: "created", url: checkoutUrl };
}
