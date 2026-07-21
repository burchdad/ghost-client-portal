import { describe, expect, it, vi } from "vitest";
import {
  getFixtureProposalByToken,
  grayMattersAcceptedPaymentToken,
  grayMattersDevelopmentToken,
} from "@/server/proposals/fixture";
import {
  amountPaid,
  amountRemaining,
  assertSupportedCurrency,
  dollarsToMinorUnits,
  paymentScheduleTotal,
  paymentStatusFromRefund,
  reconcilePaymentSchedule,
  selectDepositItem,
  validateDepositAmount,
} from "./calculations";
import { evaluateDepositPaymentEligibility } from "./eligibility";
import { createCheckoutMetadata, parseCheckoutMetadata } from "./metadata";
import { stripeIdempotencyKey, redactStripeId } from "@/server/stripe/ids";
import { getStripeServerConfig } from "@/server/stripe/config";
import { createProposalPaymentCheckoutSession } from "@/server/stripe/checkout";

describe("payment calculations", () => {
  it("uses minor units and reconciles Gray Matters schedule", () => {
    const proposal = getFixtureProposalByToken(
      grayMattersAcceptedPaymentToken,
    )!;

    expect(dollarsToMinorUnits("$750.00")).toBe(75000);
    expect(assertSupportedCurrency("USD")).toBe("usd");
    expect(paymentScheduleTotal(proposal.paymentSchedule)).toBe(150000);
    expect(reconcilePaymentSchedule(150000, proposal.paymentSchedule)).toEqual({
      total: 150000,
      reconciled: true,
    });
    expect(amountPaid([{ amountCents: 75000, status: "PAID" }])).toBe(75000);
    expect(amountRemaining(150000, 75000)).toBe(75000);
  });

  it("selects and validates the trusted deposit item", () => {
    const proposal = getFixtureProposalByToken(
      grayMattersAcceptedPaymentToken,
    )!;
    const deposit = selectDepositItem(proposal.paymentSchedule);

    expect(deposit?.amountCents).toBe(75000);
    expect(validateDepositAmount(deposit!)).toBe(75000);
  });

  it("calculates refund status safely", () => {
    expect(paymentStatusFromRefund(75000, 0)).toBe("PAID");
    expect(paymentStatusFromRefund(75000, 25000)).toBe("PARTIALLY_REFUNDED");
    expect(paymentStatusFromRefund(75000, 75000)).toBe("REFUNDED");
  });
});

describe("payment eligibility", () => {
  it("requires an accepted payment-pending proposal", () => {
    const unaccepted = {
      ...getFixtureProposalByToken(grayMattersDevelopmentToken)!,
      organization: {
        ...getFixtureProposalByToken(grayMattersDevelopmentToken)!.organization,
        contacts: [],
      },
      payments: [],
      projects: [],
    };
    const accepted = {
      ...getFixtureProposalByToken(grayMattersAcceptedPaymentToken)!,
      organization: {
        ...getFixtureProposalByToken(grayMattersAcceptedPaymentToken)!
          .organization,
        contacts: [],
      },
      payments: [],
      projects: [],
    };

    expect(evaluateDepositPaymentEligibility(unaccepted).eligible).toBe(false);
    expect(evaluateDepositPaymentEligibility(accepted).eligible).toBe(true);
  });

  it("rejects already paid deposits", () => {
    const accepted = {
      ...getFixtureProposalByToken(grayMattersAcceptedPaymentToken)!,
      organization: {
        ...getFixtureProposalByToken(grayMattersAcceptedPaymentToken)!
          .organization,
        contacts: [],
      },
      payments: [],
      projects: [],
    };
    accepted.paymentSchedule[0] = {
      ...accepted.paymentSchedule[0],
      status: "PAID",
      paidAt: new Date(),
    };

    expect(evaluateDepositPaymentEligibility(accepted)).toMatchObject({
      eligible: false,
      reason: "already-paid",
    });
  });
});

describe("Stripe metadata and config", () => {
  it("creates safe metadata and deterministic idempotency keys", () => {
    const metadata = createCheckoutMetadata({
      organizationId: "org_1",
      proposalId: "proposal_1",
      proposalNumber: "GCP-2026-0001",
      proposalAcceptanceId: "acceptance_1",
      paymentScheduleItemId: "schedule_1",
      internalPaymentId: "payment_1",
      paymentType: "DEPOSIT",
      environment: "test",
      requestId: "request_1",
    });

    expect(parseCheckoutMetadata(metadata).internalPaymentId).toBe("payment_1");
    expect(
      stripeIdempotencyKey(["checkout", "create", "schedule_1", "payment_1"]),
    ).toBe("checkout:create:schedule_1:payment_1");
    expect(redactStripeId("cs_test_123456789")).toBe("cs_test_...6789");
  });

  it("fails safely when Stripe configuration is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(getStripeServerConfig()).toMatchObject({ configured: false });

    const result = await createProposalPaymentCheckoutSession("missing-token");
    expect(result).toMatchObject({
      status: "unavailable",
      reason: "stripe-not-configured",
    });
    vi.unstubAllEnvs();
  });
});

describe("mocked webhook validation behavior", () => {
  it("rejects missing checkout metadata", () => {
    expect(() => parseCheckoutMetadata(null)).toThrow(/missing/);
    expect(() =>
      parseCheckoutMetadata({ internalPaymentId: "payment" }),
    ).toThrow(/organizationId/);
  });
});
