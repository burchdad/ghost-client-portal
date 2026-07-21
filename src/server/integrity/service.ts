import type {
  Payment,
  PaymentScheduleItem,
  Project,
  Proposal,
  ProposalAcceptance,
} from "@prisma/client";

export type IntegrityWarning = {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
  repair?: string;
};

export function inspectProposalLifecycle(
  proposal: Proposal & {
    acceptances: ProposalAcceptance[];
    paymentSchedule: PaymentScheduleItem[];
    payments: Payment[];
    projects: Project[];
  },
) {
  const warnings: IntegrityWarning[] = [];
  const accepted = Boolean(
    proposal.acceptedAt ||
    proposal.status === "PAYMENT_PENDING" ||
    proposal.status === "DEPOSIT_PAID" ||
    proposal.status === "ACTIVE",
  );
  const hasPaidDeposit = proposal.paymentSchedule.some(
    (item) => item.paymentType === "DEPOSIT" && item.status === "PAID",
  );
  const paidCents = proposal.payments
    .filter(
      (payment) =>
        payment.status === "PAID" || payment.status === "PARTIALLY_REFUNDED",
    )
    .reduce((total, payment) => total + payment.amountCents, 0);

  if (accepted && !proposal.viewedAt) {
    warnings.push({
      code: "accepted_without_view",
      severity: "warning",
      message:
        "Proposal is accepted or payment-ready but has no viewed timestamp.",
      repair: "Confirm historical context before setting a viewed timestamp.",
    });
  }

  if (proposal.signedAt && !proposal.acceptances.length) {
    warnings.push({
      code: "signed_without_acceptance",
      severity: "critical",
      message:
        "Proposal has a signed timestamp but no immutable acceptance record.",
    });
  }

  if (
    proposal.status === "PAYMENT_PENDING" &&
    !proposal.paymentSchedule.length
  ) {
    warnings.push({
      code: "payment_pending_no_schedule",
      severity: "critical",
      message: "Proposal is payment pending but has no payment schedule.",
    });
  }

  for (const item of proposal.paymentSchedule) {
    if (
      (item.status === "CHECKOUT_CREATED" || item.status === "PROCESSING") &&
      !item.stripeCheckoutId
    ) {
      warnings.push({
        code: "checkout_without_stripe_session",
        severity: "critical",
        message: `${item.label} is ${item.status} but has no Stripe Checkout Session ID.`,
      });
    }
  }

  if (
    proposal.projects.some((project) => project.status === "ONBOARDING") &&
    !hasPaidDeposit
  ) {
    warnings.push({
      code: "onboarding_before_deposit",
      severity: "warning",
      message: "A project is in onboarding before a deposit is confirmed paid.",
      repair:
        "Use payment recovery only after verifying a confirmed Stripe payment.",
    });
  }

  if (proposal.status === "ACTIVE" && !hasPaidDeposit) {
    warnings.push({
      code: "active_without_paid_deposit",
      severity: "critical",
      message: "Proposal is active while the deposit schedule item is unpaid.",
    });
  }

  if (paidCents > proposal.totalCents) {
    warnings.push({
      code: "paid_exceeds_contract",
      severity: "critical",
      message:
        "Recorded paid amount is greater than the proposal contract value.",
    });
  }

  if (proposal.projects.length > 1) {
    warnings.push({
      code: "duplicate_project",
      severity: "critical",
      message: "More than one project is linked to this proposal.",
    });
  }

  return warnings;
}
