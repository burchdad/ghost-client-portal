import type { PaymentScheduleItem } from "@prisma/client";
import { isTokenExpired, isTokenRevoked } from "@/server/proposals/tokens";
import {
  assertSupportedCurrency,
  reconcilePaymentSchedule,
  selectDepositItem,
  validateDepositAmount,
} from "./calculations";
import type { PaymentEligibility, ProposalPaymentContext } from "./types";

const terminalBadProposalStatuses = [
  "CANCELLED",
  "DECLINED",
  "EXPIRED",
  "DRAFT",
] as const;

export function evaluateDepositPaymentEligibility(
  proposal: ProposalPaymentContext | null,
): PaymentEligibility {
  const correlationId = crypto.randomUUID();

  if (
    !proposal ||
    proposal.deletedAt ||
    !proposal.isPublic ||
    isTokenRevoked(proposal) ||
    isTokenExpired(proposal)
  ) {
    return { eligible: false, reason: "payment-unavailable", correlationId };
  }

  if (
    terminalBadProposalStatuses.includes(
      proposal.status as (typeof terminalBadProposalStatuses)[number],
    )
  ) {
    return { eligible: false, reason: "proposal-unavailable", correlationId };
  }

  const acceptance = proposal.acceptances[0];
  if (!acceptance) {
    return { eligible: false, reason: "proposal-not-accepted", correlationId };
  }

  if (proposal.status !== "PAYMENT_PENDING") {
    const paidDeposit = proposal.paymentSchedule.find(
      (item) => item.paymentType === "DEPOSIT" && item.status === "PAID",
    );
    if (
      proposal.status === "DEPOSIT_PAID" ||
      proposal.status === "ACTIVE" ||
      paidDeposit
    ) {
      return { eligible: false, reason: "already-paid", correlationId };
    }

    return { eligible: false, reason: "payment-not-ready", correlationId };
  }

  assertSupportedCurrency(proposal.currency);
  reconcilePaymentSchedule(proposal.totalCents, proposal.paymentSchedule);

  const paidDeposit = proposal.paymentSchedule.find(
    (item) => item.paymentType === "DEPOSIT" && item.status === "PAID",
  );
  if (paidDeposit) {
    return { eligible: false, reason: "already-paid", correlationId };
  }

  const depositItem = selectDepositItem(proposal.paymentSchedule);
  if (!depositItem) {
    return { eligible: false, reason: "deposit-unavailable", correlationId };
  }

  validateDepositItem(depositItem, proposal.currency);

  const existingPayment = proposal.payments.find(
    (payment) =>
      payment.paymentScheduleItemId === depositItem.id &&
      payment.status !== "FAILED" &&
      payment.status !== "CANCELLED" &&
      payment.status !== "REFUNDED",
  );

  return { eligible: true, proposal, acceptance, depositItem, existingPayment };
}

function validateDepositItem(
  item: PaymentScheduleItem,
  expectedCurrency: string,
) {
  validateDepositAmount(item);
  assertSupportedCurrency(item.currency);

  if (item.currency !== expectedCurrency) {
    throw new Error("Deposit currency must match proposal currency.");
  }

  if (item.status === "PAID") {
    throw new Error("Deposit has already been paid.");
  }
}
