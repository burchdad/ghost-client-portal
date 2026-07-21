import { getStripeServerConfig } from "@/server/stripe/config";
import {
  getProposalPaymentContextByTokenWithFallback,
  getLatestDepositPaymentForToken,
} from "./repository";
import { evaluateDepositPaymentEligibility } from "./eligibility";
import { amountPaid, amountRemaining } from "./calculations";

export async function getPaymentPageState(token: string) {
  const proposal = await getProposalPaymentContextByTokenWithFallback(token);
  const eligibility = evaluateDepositPaymentEligibility(proposal);
  const stripeConfig = getStripeServerConfig();

  if (!proposal || !eligibility.eligible) {
    return {
      status: "unavailable" as const,
      reason: eligibility.eligible ? "payment-unavailable" : eligibility.reason,
      correlationId: eligibility.eligible
        ? crypto.randomUUID()
        : eligibility.correlationId,
      stripeConfigured: stripeConfig.configured,
    };
  }

  const paid = amountPaid(proposal.payments);
  const depositDue = eligibility.depositItem.amountCents;

  return {
    status: "ready" as const,
    proposal,
    acceptance: eligibility.acceptance,
    depositItem: eligibility.depositItem,
    contractTotalCents: proposal.totalCents,
    amountPaidCents: paid,
    depositDueCents: depositDue,
    remainingAfterDepositCents: amountRemaining(
      proposal.totalCents,
      paid + depositDue,
    ),
    stripeConfigured: stripeConfig.configured,
    stripeUnavailableReason: stripeConfig.configured
      ? null
      : stripeConfig.reason,
  };
}

export async function getPaymentSuccessState(token: string) {
  const latest = await getLatestDepositPaymentForToken(token).catch(() => null);

  if (!latest) {
    return { status: "unavailable" as const };
  }

  if (latest.payment?.status === "PAID" || latest.deposit?.status === "PAID") {
    return { status: "confirmed" as const, ...latest };
  }

  if (
    latest.payment?.status === "PROCESSING" ||
    latest.payment?.status === "CHECKOUT_CREATED"
  ) {
    return { status: "processing" as const, ...latest };
  }

  if (
    latest.payment?.status === "FAILED" ||
    latest.payment?.status === "CANCELLED"
  ) {
    return { status: "failed" as const, ...latest };
  }

  return { status: "processing" as const, ...latest };
}
