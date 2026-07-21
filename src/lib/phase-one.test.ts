import { describe, expect, it } from "vitest";
import { hasInternalRole, hasOrganizationRole } from "@/lib/auth/permissions";
import {
  calculateRemainingBalance,
  assertTrustedPaymentAmount,
} from "@/lib/payments";
import {
  assertProposalTransition,
  canTransitionProposal,
} from "@/lib/proposals";
import { createAcceptanceHash } from "@/lib/signatures";
import {
  tenantOwnedWhere,
  tenantProjectWhere,
  tenantProposalWhere,
} from "@/lib/tenant-filters";
import { createNotificationInput } from "@/lib/notifications";
import { isRetryableStripeEvent } from "@/lib/stripe-events";

describe("authorization helpers", () => {
  it("accept internal users only when their role is allowed", () => {
    expect(hasInternalRole("FOUNDER", ["FOUNDER"])).toBe(true);
    expect(hasInternalRole("SUPPORT_AGENT", ["FOUNDER"])).toBe(false);
    expect(hasInternalRole(null, ["FOUNDER"])).toBe(false);
  });

  it("accept organization users only when their role is allowed", () => {
    expect(hasOrganizationRole("OWNER", ["OWNER"])).toBe(true);
    expect(hasOrganizationRole("VIEWER", ["OWNER"])).toBe(false);
  });
});

describe("tenant scoped query filters", () => {
  it("scopes projects to the requesting user membership", () => {
    expect(tenantProjectWhere("user_a", "project_a")).toMatchObject({
      id: "project_a",
      portalVisible: true,
      organization: {
        memberships: { some: { userId: "user_a", deletedAt: null } },
      },
    });
  });

  it("scopes proposals, files, payments, messages, requests, and deliverables by organization membership", () => {
    expect(
      tenantProposalWhere("user_a", "proposal_a").organization.memberships.some
        .userId,
    ).toBe("user_a");
    expect(
      tenantOwnedWhere("user_a", "file_a").organization.memberships.some.userId,
    ).toBe("user_a");
    expect(
      tenantOwnedWhere("user_a", "payment_a").organization.memberships.some
        .userId,
    ).toBe("user_a");
    expect(
      tenantOwnedWhere("user_a", "message_thread_a").organization.memberships
        .some.userId,
    ).toBe("user_a");
    expect(
      tenantOwnedWhere("user_a", "request_a").organization.memberships.some
        .userId,
    ).toBe("user_a");
    expect(
      tenantOwnedWhere("user_a", "deliverable_a").organization.memberships.some
        .userId,
    ).toBe("user_a");
  });
});

describe("payments", () => {
  it("calculates remaining balances without going negative", () => {
    expect(calculateRemainingBalance(150000, 75000)).toBe(75000);
    expect(calculateRemainingBalance(150000, 200000)).toBe(0);
  });

  it("rejects browser-supplied amounts that differ from trusted schedule records", () => {
    expect(() => assertTrustedPaymentAmount(100, 75000)).toThrow(/trusted/);
    expect(assertTrustedPaymentAmount(75000, 75000)).toBe(75000);
  });
});

describe("proposal status transitions", () => {
  it("allows the Phase 2 proposal acceptance path and rejects invalid jumps", () => {
    expect(canTransitionProposal("SENT", "VIEWED")).toBe(true);
    expect(canTransitionProposal("VIEWED", "APPROVED")).toBe(true);
    expect(canTransitionProposal("SENT", "ACTIVE")).toBe(false);
    expect(() => assertProposalTransition("DECLINED", "ACTIVE")).toThrow(
      /cannot transition/,
    );
  });
});

describe("signature acceptance", () => {
  it("creates stable tamper-evident acceptance hashes", () => {
    const acceptedAt = new Date("2026-07-21T12:00:00.000Z");
    const first = createAcceptanceHash({
      proposalId: "proposal_a",
      signerName: "Client Contact",
      signerTitle: "Owner",
      typedSignature: "Client Contact",
      acceptedAt,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    const second = createAcceptanceHash({
      proposalId: "proposal_a",
      signerName: "Client Contact",
      signerTitle: "Owner",
      typedSignature: "Changed",
      acceptedAt,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(first).toHaveLength(64);
    expect(first).not.toEqual(second);
  });
});

describe("notifications and Stripe idempotency", () => {
  it("creates client-safe notification input", () => {
    expect(
      createNotificationInput({
        organizationId: "org_a",
        type: "onboarding.required",
        title: "Complete onboarding",
        body: "Upload source files.",
      }),
    ).toMatchObject({ organizationId: "org_a", emailQueued: false });
  });

  it("does not retry an already processed Stripe event", () => {
    expect(isRetryableStripeEvent(null)).toBe(true);
    expect(isRetryableStripeEvent({ processedAt: null })).toBe(true);
    expect(isRetryableStripeEvent({ processedAt: new Date() })).toBe(false);
  });
});
