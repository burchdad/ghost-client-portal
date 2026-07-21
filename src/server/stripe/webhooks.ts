import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashCanonical } from "@/server/proposals/hashing";
import { parseCheckoutMetadata } from "@/server/payments/metadata";
import { paymentStatusFromRefund } from "@/server/payments/calculations";
import {
  markPaymentFailed,
  markPaymentRefunded,
} from "@/server/payments/transitions";
import { activateProjectForDeposit } from "@/server/projects/activation";
import { transitionProposalStatus } from "@/server/proposals/transitions";
import { getEmailProvider } from "@/server/email/provider";
import {
  clientPaymentConfirmationEmail,
  internalPaymentNotificationEmail,
  paymentFailureEmail,
} from "@/server/email/templates";
import { assertStripeLivemodeMatchesEnvironment } from "@/server/env";
import { getStripeClient } from "./client";
import { getStripeServerConfig } from "./config";
import { redactStripeId } from "./ids";

export async function constructStripeWebhookEvent(request: Request) {
  const config = getStripeServerConfig();

  if (!config.configured || !config.webhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new Error("Stripe signature is missing.");
  }

  const body = await request.text();
  return getStripeClient().webhooks.constructEvent(
    body,
    signature,
    config.webhookSecret,
  );
}

export async function handleStripeWebhook(request: Request) {
  let event: Stripe.Event;

  try {
    event = await constructStripeWebhookEvent(request);
  } catch (error) {
    console.warn("Stripe webhook rejected", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Invalid Stripe webhook." },
      { status: 400 },
    );
  }

  const result = await processStripeEvent(event);
  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}

export async function processStripeEvent(event: Stripe.Event) {
  const db = getDb();
  const payloadHash = hashCanonical(safeEventPayload(event));

  const existing = await db.stripeEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing?.processedAt) {
    return { ok: true, duplicate: true };
  }

  const stripeEvent =
    existing ??
    (await db.stripeEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        apiVersion: event.api_version ?? null,
        livemode: event.livemode,
        payloadHash,
        processingStatus: "PROCESSING",
        payload: safeEventPayload(event),
        attemptCount: 1,
      },
    }));

  try {
    assertStripeLivemodeMatchesEnvironment(event.livemode);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "checkout.session.expired":
        await handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await recordNoOpEvent(event);
        break;
      default:
        await recordNoOpEvent(event);
    }

    await db.stripeEvent.update({
      where: { id: stripeEvent.id },
      data: {
        processedAt: new Date(),
        processingStatus: "PAID",
        processingNote: "Processed safely.",
      },
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 300)
        : "Unknown webhook processing error.";
    await db.stripeEvent.update({
      where: { id: stripeEvent.id },
      data: {
        processingStatus: "RECOVERY_REQUIRED",
        lastError: message,
        attemptCount: { increment: existing ? 1 : 0 },
      },
    });
    console.error("Stripe webhook processing requires recovery", {
      eventId: event.id,
      type: event.type,
      message,
    });
    return { ok: false, recoveryRequired: true };
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const metadata = parseCheckoutMetadata(session.metadata);
  const amountTotal = session.amount_total;
  const currency = session.currency?.toLowerCase();

  await getDb().$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: metadata.internalPaymentId },
      include: {
        paymentScheduleItem: true,
        proposal: true,
        organization: true,
      },
    });

    if (!payment.paymentScheduleItem || !payment.proposal) {
      throw new Error("Payment is missing trusted schedule or proposal.");
    }

    assertMetadataMatchesPayment(metadata, payment);
    assertStripePaymentMatches(
      payment.amountCents,
      payment.currency,
      amountTotal,
      currency,
    );
    assertStripeCustomerMatches(payment.stripeCustomerId, session.customer);

    if (payment.status === "PAID") {
      return;
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: session.payment_status === "paid" ? "PAID" : "PROCESSING",
        stripeCheckoutId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        paidAt: session.payment_status === "paid" ? new Date() : null,
      },
    });

    await tx.paymentScheduleItem.update({
      where: { id: payment.paymentScheduleItem.id },
      data: {
        status: session.payment_status === "paid" ? "PAID" : "PROCESSING",
        stripeCheckoutId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        paidAt: session.payment_status === "paid" ? new Date() : null,
      },
    });

    await tx.outboxEvent.create({
      data: {
        eventType:
          session.payment_status === "paid"
            ? "payment.completed"
            : "payment.processing",
        aggregateType: "Payment",
        aggregateId: payment.id,
        payload: { stripeCheckoutId: redactStripeId(session.id) },
      },
    });
  });
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const metadata = parseCheckoutMetadata(session.metadata);

  await getDb().$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: metadata.internalPaymentId },
    });
    if (!payment || payment.status === "PAID") {
      return;
    }

    if (payment.stripeCheckoutId && payment.stripeCheckoutId !== session.id) {
      return;
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELLED" },
    });
    await tx.paymentScheduleItem.updateMany({
      where: {
        id: metadata.paymentScheduleItemId,
        stripeCheckoutId: session.id,
      },
      data: { status: "PENDING" },
    });
  });
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const metadata = parseCheckoutMetadata(intent.metadata);
  const amountReceived = intent.amount_received || intent.amount;
  const currency = intent.currency?.toLowerCase();

  await getDb().$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: metadata.internalPaymentId },
      include: {
        paymentScheduleItem: true,
        proposal: true,
        organization: { include: { contacts: true } },
      },
    });

    if (!payment.paymentScheduleItem || !payment.proposal) {
      throw new Error("Payment is missing trusted schedule or proposal.");
    }

    assertMetadataMatchesPayment(metadata, payment);
    assertStripeCustomerMatches(payment.stripeCustomerId, intent.customer);

    if (payment.status === "PAID" && payment.proposal.status === "ACTIVE") {
      return;
    }

    assertStripePaymentMatches(
      payment.amountCents,
      payment.currency,
      amountReceived,
      currency,
    );

    const paidAt = new Date();
    const paidPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt,
        stripePaymentIntentId: intent.id,
      },
    });

    await tx.paymentScheduleItem.update({
      where: { id: payment.paymentScheduleItem.id },
      data: {
        status: "PAID",
        paidAt,
        stripePaymentIntentId: intent.id,
      },
    });

    const depositPaidProposal =
      payment.proposal.status === "PAYMENT_PENDING"
        ? await transitionProposalStatus(tx, {
            proposalId: payment.proposal.id,
            organizationId: payment.proposal.organizationId,
            from: "PAYMENT_PENDING",
            to: "DEPOSIT_PAID",
            actorLabel: "stripe_webhook",
          })
        : payment.proposal;

    let projectActivationStatus = "activated";
    try {
      const project = await activateProjectForDeposit(tx, {
        proposal: depositPaidProposal ?? payment.proposal,
        payment: paidPayment,
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { projectId: project.id },
      });
      await transitionProposalStatus(tx, {
        proposalId: payment.proposal.id,
        organizationId: payment.proposal.organizationId,
        from: "DEPOSIT_PAID",
        to: "ACTIVE",
        actorLabel: "stripe_webhook",
        idempotent: payment.proposal.status === "ACTIVE",
      });
    } catch (error) {
      projectActivationStatus = "recovery_required";
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          recoveryRequired: true,
          recoveryReason:
            error instanceof Error
              ? error.message.slice(0, 240)
              : "Project activation failed.",
        },
      });
      await tx.notification.create({
        data: {
          organizationId: payment.organizationId,
          type: "payment.activation_recovery_required",
          title: "Payment confirmed, activation needs recovery",
          body: payment.proposal.title,
          linkTarget: `/admin/payments`,
        },
      });
      return;
    }

    await Promise.all([
      tx.activityEvent.create({
        data: {
          organizationId: payment.organizationId,
          type: "payment.completed",
          title: "Deposit payment received",
          body: payment.proposal.title,
        },
      }),
      tx.notification.create({
        data: {
          organizationId: payment.organizationId,
          type: "payment.received",
          title: "Payment received",
          body: "Your deposit payment was received and your project onboarding is ready.",
          linkTarget: `/projects`,
        },
      }),
      tx.auditLog.create({
        data: {
          eventType: "payment.completed",
          entityType: "Payment",
          entityId: payment.id,
          metadata: {
            stripePaymentIntentId: redactStripeId(intent.id),
            projectActivationStatus,
          },
        },
      }),
      tx.outboxEvent.create({
        data: {
          eventType: "proposal.deposit_paid",
          aggregateType: "Proposal",
          aggregateId: payment.proposal.id,
          payload: { paymentId: payment.id },
        },
      }),
    ]);

    const primaryEmail = payment.organization.contacts.find(
      (contact) => contact.isPrimary,
    )?.email;
    const provider = getEmailProvider();
    const remaining = Math.max(
      payment.proposal.totalCents - payment.amountCents,
      0,
    );
    const clientEmail = clientPaymentConfirmationEmail({
      organization: payment.organization.name,
      proposal: payment.proposal.title,
      amountCents: payment.amountCents,
      currency: payment.currency,
      remainingCents: remaining,
      paymentDate: paidAt,
      projectActivated: projectActivationStatus === "activated",
    });
    const internalEmail = internalPaymentNotificationEmail({
      organization: payment.organization.name,
      proposal: payment.proposal.title,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paymentType: payment.paymentType,
      stripeReference: intent.id,
      activationStatus: projectActivationStatus,
    });
    await provider.send({
      to: primaryEmail,
      idempotencyKey: `email:client-payment:${payment.id}`,
      ...clientEmail,
    });
    await provider.send({
      to: process.env.EMAIL_FROM,
      idempotencyKey: `email:internal-payment:${payment.id}`,
      ...internalEmail,
    });
  });
}

async function handlePaymentIntentFailed(intent: Stripe.PaymentIntent) {
  const metadata = parseCheckoutMetadata(intent.metadata);
  const failure = intent.last_payment_error;

  await getDb().$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: metadata.internalPaymentId },
      include: { proposal: true, organization: true },
    });

    if (!payment || payment.status === "PAID") {
      return;
    }

    await markPaymentFailed(tx, {
      paymentId: payment.id,
      paymentScheduleItemId: payment.paymentScheduleItemId,
      failureCode: failure?.code,
      failureMessage: failure?.message,
    });

    await tx.notification.create({
      data: {
        organizationId: payment.organizationId,
        type: "payment.failed",
        title: "Payment was not completed",
        body: "Your deposit payment was not confirmed. You can safely retry from the secure payment page.",
        linkTarget: "/payments",
      },
    });
    await tx.outboxEvent.create({
      data: {
        eventType: "payment.failed",
        aggregateType: "Payment",
        aggregateId: payment.id,
        payload: { reason: failure?.code ?? "unknown" },
      },
    });

    const email = paymentFailureEmail({
      organization: payment.organization.name,
      proposal: payment.proposal?.title ?? "Proposal",
    });
    await getEmailProvider().send({
      to: null,
      idempotencyKey: `email:payment-failed:${payment.id}`,
      ...email,
    });
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!paymentIntentId) {
    return;
  }

  await getDb().$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!payment) {
      return;
    }

    const refundedAmountCents = charge.amount_refunded ?? 0;
    const status = paymentStatusFromRefund(
      payment.amountCents,
      refundedAmountCents,
    );
    if (status === "PAID") {
      return;
    }
    await markPaymentRefunded(tx, {
      paymentId: payment.id,
      paymentScheduleItemId: payment.paymentScheduleItemId,
      refundedAmountCents,
      status,
    });
    await tx.auditLog.create({
      data: {
        eventType: "payment.refunded",
        entityType: "Payment",
        entityId: payment.id,
        metadata: {
          refundedAmountCents,
          stripeChargeId: redactStripeId(charge.id),
          internalReviewRequired: true,
        },
      },
    });
    await tx.outboxEvent.create({
      data: {
        eventType: "payment.refunded",
        aggregateType: "Payment",
        aggregateId: payment.id,
        payload: { refundedAmountCents, internalReviewRequired: true },
      },
    });
  });
}

async function recordNoOpEvent(event: Stripe.Event) {
  await getDb().outboxEvent.create({
    data: {
      eventType: `stripe.noop.${event.type}`,
      aggregateType: "StripeEvent",
      aggregateId: event.id,
      payload: { eventType: event.type },
    },
  });
}

function assertStripePaymentMatches(
  trustedAmountCents: number,
  trustedCurrency: string,
  stripeAmountCents: number | null,
  stripeCurrency: string | null | undefined,
) {
  if (stripeAmountCents !== trustedAmountCents) {
    throw new Error("Stripe amount did not match trusted payment record.");
  }

  if (stripeCurrency !== trustedCurrency) {
    throw new Error("Stripe currency did not match trusted payment record.");
  }
}

function assertMetadataMatchesPayment(
  metadata: ReturnType<typeof parseCheckoutMetadata>,
  payment: {
    organizationId: string;
    proposalId: string | null;
    paymentScheduleItemId: string | null;
    paymentType: string;
  },
) {
  if (metadata.organizationId !== payment.organizationId) {
    throw new Error(
      "Stripe metadata organization does not match payment record.",
    );
  }

  if (metadata.proposalId !== payment.proposalId) {
    throw new Error("Stripe metadata proposal does not match payment record.");
  }

  if (metadata.paymentScheduleItemId !== payment.paymentScheduleItemId) {
    throw new Error(
      "Stripe metadata schedule item does not match payment record.",
    );
  }

  if (metadata.paymentType !== payment.paymentType) {
    throw new Error(
      "Stripe metadata payment type does not match payment record.",
    );
  }
}

function assertStripeCustomerMatches(
  trustedCustomerId: string | null,
  stripeCustomer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  const stripeCustomerId =
    typeof stripeCustomer === "string" ? stripeCustomer : stripeCustomer?.id;
  if (
    trustedCustomerId &&
    stripeCustomerId &&
    trustedCustomerId !== stripeCustomerId
  ) {
    throw new Error("Stripe customer does not match payment organization.");
  }
}

function safeEventPayload(event: Stripe.Event) {
  const object = event.data.object as {
    id?: string;
    object?: string;
    metadata?: Record<string, string>;
  };

  return {
    id: event.id,
    type: event.type,
    apiVersion: event.api_version,
    livemode: event.livemode,
    objectId: object.id,
    objectType: object.object,
    metadata: object.metadata ?? {},
  };
}
