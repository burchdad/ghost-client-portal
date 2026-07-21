import { describe, expect, it, vi } from "vitest";
import {
  assertStripeLivemodeMatchesEnvironment,
  validateRuntimeEnvironment,
  validateStripeEnvironment,
} from "@/server/env";
import { inspectProposalLifecycle } from "@/server/integrity/service";
import { assertLaunchReviewChecklist } from "@/server/launch-execution/service";
import {
  summarizeLaunchGate,
  summarizeReadiness,
} from "@/server/launch-readiness/service";
import {
  calculateOnboardingCompletion,
  assertOnboardingComplete,
} from "@/server/onboarding/service";
import { validateRecoveryStripeIntent } from "@/server/payments/recovery";
import {
  detectPlaceholders,
  isDevelopmentTokenHint,
} from "@/server/placeholders";
import { calculateProjectProgress } from "@/server/projects/progress";
import {
  createInvitation,
  generateInvitationToken,
  hashInvitationToken,
} from "@/server/invitations/service";

describe("environment safety", () => {
  it("rejects live Stripe keys outside production", () => {
    expect(() =>
      validateStripeEnvironment({
        environment: "staging",
        secretKey: "sk_live_example",
        publishableKey: "pk_live_example",
      }),
    ).toThrow(/Non-production/);
  });

  it("rejects test Stripe keys in production without an explicit override", () => {
    vi.stubEnv("ALLOW_STRIPE_TEST_IN_PRODUCTION", "");
    expect(() =>
      validateStripeEnvironment({
        environment: "production",
        secretKey: "sk_test_example",
        publishableKey: "pk_test_example",
      }),
    ).toThrow(/Production cannot use Stripe test keys/);
    vi.unstubAllEnvs();
  });

  it("rejects webhook livemode mismatches", () => {
    expect(() =>
      assertStripeLivemodeMatchesEnvironment(false, "production"),
    ).toThrow(/livemode/);
    expect(() =>
      assertStripeLivemodeMatchesEnvironment(true, "staging"),
    ).toThrow(/livemode/);
  });

  it("blocks production runtime when required values are missing or placeholders", () => {
    const result = validateRuntimeEnvironment({
      environment: "production",
      appUrl: "http://localhost:3000",
      databaseUrl: "postgres://example",
      authSecret: "placeholder",
      stripeSecretKey: "sk_live_example",
      stripePublishableKey: "pk_live_example",
      stripeWebhookSecret: "whsec_placeholder",
      emailFrom: "",
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.findings.map((finding) => finding.message).join(" ")).toMatch(
      /localhost|AUTH_SECRET|EMAIL_FROM/,
    );
  });
});

describe("proposal integrity warnings", () => {
  it("detects accepted proposals without viewed timestamps and active unpaid deposits", () => {
    const warnings = inspectProposalLifecycle({
      id: "proposal",
      organizationId: "org",
      primaryContactId: null,
      templateId: null,
      internalOwnerId: null,
      title: "Proposal",
      proposalNumber: "GCP-1",
      publicTokenHash: "hash",
      publicTokenHint: null,
      isTestRecord: false,
      testRunId: null,
      tokenExpiresAt: null,
      tokenRevokedAt: null,
      isPublic: true,
      sentAt: new Date(),
      executiveSummary: "",
      objectives: "",
      scopeOfWork: "",
      exclusions: "",
      timeline: "",
      pricingSummary: "",
      terms: "",
      totalCents: 1000,
      currency: "usd",
      clientSignatory: null,
      status: "ACTIVE",
      viewedAt: null,
      acceptedAt: new Date(),
      signedAt: null,
      paidAt: null,
      expiresAt: null,
      lastViewedAt: null,
      viewCount: 0,
      version: 1,
      versionLabel: "v1",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      acceptances: [],
      paymentSchedule: [],
      payments: [],
      projects: [],
    });

    expect(warnings.map((warning) => warning.code)).toContain(
      "accepted_without_view",
    );
    expect(warnings.map((warning) => warning.code)).toContain(
      "active_without_paid_deposit",
    );
  });
});

describe("client lifecycle calculations", () => {
  it("calculates project progress from phases, milestones, and actions", () => {
    expect(
      calculateProjectProgress({
        phases: [
          { status: "Completed", progress: 100 },
          { status: "Waiting on Client", progress: 10 },
        ],
        milestones: [{ status: "Completed" }, { status: "Waiting on Client" }],
        actions: [{ status: "COMPLETED" }, { status: "PENDING" }],
      }),
    ).toBeGreaterThan(40);
  });

  it("requires all required onboarding fields before submission", () => {
    const questions = [
      {
        fieldKey: "primary_services",
        required: true,
        prompt: "Primary services",
      },
      {
        fieldKey: "additional_notes",
        required: false,
        prompt: "Additional notes",
      },
    ];
    const responses = [
      { fieldKey: "primary_services", value: "Technology consulting" },
    ];

    expect(calculateOnboardingCompletion({ questions, responses })).toBe(100);
    expect(() =>
      assertOnboardingComplete({ questions, responses }),
    ).not.toThrow();
    expect(() =>
      assertOnboardingComplete({ questions, responses: [] }),
    ).toThrow(/Primary services/);
  });

  it("generates hashable opaque invitation tokens", () => {
    const token = generateInvitationToken();
    expect(token.length).toBeGreaterThan(20);
    expect(hashInvitationToken(token)).toHaveLength(64);
    expect(hashInvitationToken(token)).not.toBe(token);
  });

  it("detects placeholder identity values and development token hints", () => {
    expect(
      detectPlaceholders({
        clientEmail: "client@example.com",
        title: "Primary Contact",
      }),
    ).toHaveLength(2);
    expect(isDevelopmentTokenHint("seed")).toBe(true);
    expect(isDevelopmentTokenHint("a8f91c0b")).toBe(false);
  });

  it("blocks production invitations to placeholder recipients before database writes", async () => {
    vi.stubEnv("APP_ENV", "production");
    await expect(
      createInvitation({
        organizationId: "org",
        email: "client@example.com",
        name: "Primary Contact",
        intendedRole: "OWNER",
        createdById: "user",
        db: {} as never,
      }),
    ).rejects.toThrow(/placeholder/i);
    vi.unstubAllEnvs();
  });
});

describe("launch readiness", () => {
  it("summarizes blocking checks before warnings", () => {
    expect(
      summarizeReadiness([
        { category: "A", label: "A", status: "BLOCKED", message: "blocked" },
      ]),
    ).toBe("BLOCKED");
    expect(
      summarizeReadiness([
        { category: "A", label: "A", status: "WARNING", message: "warning" },
      ]),
    ).toBe("WARNING");
    expect(
      summarizeReadiness([
        { category: "A", label: "A", status: "READY", message: "ready" },
      ]),
    ).toBe("READY");
  });

  it("keeps the final launch gate at NO-GO while any blocker remains", () => {
    expect(
      summarizeLaunchGate(
        [
          {
            category: "Migration",
            label: "Backup",
            status: "BLOCKED",
            message: "missing",
          },
        ],
        "GO",
      ),
    ).toBe("NO-GO");
  });

  it("requires every operator launch review checkbox for GO", () => {
    const complete = {
      contactVerified: true,
      emailVerified: true,
      scopeVerified: true,
      deliverablesVerified: true,
      paymentScheduleVerified: true,
      termsVerified: true,
      expirationVerified: true,
      stripeModeVerified: true,
      existingCheckoutSessionReviewed: true,
      tokenRotated: true,
      noPlaceholdersRemain: true,
      noLifecycleInconsistenciesRemain: true,
    };

    expect(assertLaunchReviewChecklist(complete).finalStatus).toBe("GO");
    expect(
      assertLaunchReviewChecklist({ ...complete, tokenRotated: false })
        .finalStatus,
    ).toBe("NO-GO");
    expect(
      assertLaunchReviewChecklist({ ...complete, tokenRotated: false }).missing,
    ).toContain("tokenRotated");
  });
});

describe("payment recovery verification", () => {
  const payment = {
    id: "payment_1",
    organizationId: "org_1",
    proposalId: "proposal_1",
    projectId: null,
    paymentScheduleItemId: "schedule_1",
    isTestRecord: false,
    testRunId: null,
    stripePaymentIntentId: "pi_123",
    stripeCheckoutId: "cs_123",
    stripeCustomerId: "cus_123",
    stripeChargeId: null,
    stripeReceiptUrl: null,
    paymentType: "DEPOSIT",
    status: "PAID",
    amountCents: 50000,
    currency: "usd",
    idempotencyKey: null,
    requestId: null,
    failureCode: null,
    failureMessage: null,
    refundedAmountCents: 0,
    recoveryRequired: true,
    recoveryReason: "activation failed",
    checkoutDisposition: null,
    checkoutDispositionAt: null,
    checkoutDispositionById: null,
    checkoutDispositionReason: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    paidAt: new Date(),
    failedAt: null,
    paymentScheduleItem: { id: "schedule_1" },
  } as const;

  it("accepts a succeeded matching PaymentIntent", () => {
    expect(() =>
      validateRecoveryStripeIntent(payment, {
        id: "pi_123",
        status: "succeeded",
        amount: 50000,
        amount_received: 50000,
        currency: "usd",
        metadata: {
          organizationId: "org_1",
          proposalId: "proposal_1",
          proposalAcceptanceId: "acceptance_1",
          paymentScheduleItemId: "schedule_1",
          internalPaymentId: "payment_1",
          paymentType: "DEPOSIT",
        },
      }),
    ).not.toThrow();
  });

  it("rejects mismatched PaymentIntent amounts", () => {
    expect(() =>
      validateRecoveryStripeIntent(payment, {
        id: "pi_123",
        status: "succeeded",
        amount: 100,
        amount_received: 100,
        currency: "usd",
        metadata: {
          organizationId: "org_1",
          proposalId: "proposal_1",
          proposalAcceptanceId: "acceptance_1",
          paymentScheduleItemId: "schedule_1",
          internalPaymentId: "payment_1",
          paymentType: "DEPOSIT",
        },
      }),
    ).toThrow(/amount/);
  });
});
