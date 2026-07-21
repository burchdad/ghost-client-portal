import type Stripe from "stripe";
import { getStripeClient } from "./client";
import { getStripeServerConfig } from "./config";
import { assertStripeLivemodeMatchesEnvironment } from "@/server/env";

export type StripeCheckoutSessionReview = {
  available: boolean;
  sessionId: string | null;
  mode: "live" | "test" | "unknown";
  status: string | null;
  paymentStatus: string | null;
  amountTotal: number | null;
  currency: string | null;
  customerId: string | null;
  paymentIntentId: string | null;
  chargeId: string | null;
  reusable: boolean;
  createdAt: Date | null;
  expiresAt: Date | null;
  localStateMatches: boolean | null;
  guidance: string;
};

export async function reviewStripeCheckoutSession(input: {
  stripeCheckoutId: string | null;
  expectedAmountCents: number;
  expectedCurrency: string;
}): Promise<StripeCheckoutSessionReview> {
  if (!input.stripeCheckoutId) {
    return {
      available: false,
      sessionId: null,
      mode: "unknown",
      status: null,
      paymentStatus: null,
      amountTotal: null,
      currency: null,
      customerId: null,
      paymentIntentId: null,
      chargeId: null,
      reusable: false,
      createdAt: null,
      expiresAt: null,
      localStateMatches: null,
      guidance: "No Stripe Checkout Session is stored for this payment.",
    };
  }

  const config = getStripeServerConfig();
  if (!config.configured) {
    return {
      available: false,
      sessionId: input.stripeCheckoutId,
      mode: "unknown",
      status: null,
      paymentStatus: null,
      amountTotal: null,
      currency: null,
      customerId: null,
      paymentIntentId: null,
      chargeId: null,
      reusable: false,
      createdAt: null,
      expiresAt: null,
      localStateMatches: null,
      guidance:
        "Stripe is not configured, so the live session cannot be reviewed.",
    };
  }

  const session = await getStripeClient().checkout.sessions.retrieve(
    input.stripeCheckoutId,
    {
      expand: ["payment_intent", "payment_intent.latest_charge"],
    },
  );
  assertStripeLivemodeMatchesEnvironment(
    Boolean(session.livemode),
    config.environment,
  );
  const localStateMatches =
    session.amount_total === input.expectedAmountCents &&
    session.currency?.toLowerCase() === input.expectedCurrency.toLowerCase();

  return {
    available: true,
    sessionId: session.id,
    mode: session.livemode ? "live" : "test",
    status: session.status ?? null,
    paymentStatus: session.payment_status ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    customerId: stripeObjectId(session.customer),
    paymentIntentId: stripeObjectId(session.payment_intent),
    chargeId: stripeObjectId(paymentIntentLatestCharge(session.payment_intent)),
    reusable:
      session.status === "open" &&
      session.payment_status !== "paid" &&
      (!session.expires_at ||
        session.expires_at > Math.floor(Date.now() / 1000)),
    createdAt: fromUnix(session.created),
    expiresAt: fromUnix(session.expires_at),
    localStateMatches,
    guidance: guidanceForSession(session),
  };
}

function stripeObjectId(value: string | { id?: string } | null) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

function paymentIntentLatestCharge(
  value: string | Stripe.PaymentIntent | null,
): string | Stripe.Charge | null {
  if (!value || typeof value === "string") {
    return null;
  }

  return typeof value.latest_charge === "string"
    ? value.latest_charge
    : (value.latest_charge ?? null);
}

function fromUnix(value: number | null | undefined) {
  return value ? new Date(value * 1000) : null;
}

function guidanceForSession(session: Stripe.Checkout.Session) {
  if (session.payment_status === "paid") {
    return "Stripe reports this session paid. Internal activation retry may be relevant only if the local payment is also confirmed paid.";
  }

  if (session.status === "expired") {
    return "Existing live session is expired. Review state before explicitly creating any replacement session.";
  }

  if (session.status === "open") {
    return "Existing live session detected. No new session will be created unless explicitly requested after reviewing its state.";
  }

  return "Review Stripe state before taking payment operations.";
}
