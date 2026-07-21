import { describe, expect, it } from "vitest";
import { availabilityFromProposal } from "./repository";
import { getFixtureProposalByToken, grayMattersDevelopmentToken } from "./fixture";
import { canonicalize, hashCanonical } from "./hashing";
import { createProposalSnapshot, proposalContentForHash } from "./snapshot";
import {
  generateProposalToken,
  hashProposalToken,
  isTokenExpired,
  isTokenRevoked,
  redactProposalToken,
} from "./tokens";
import { canTransitionProposal } from "./transitions";
import { acceptanceSchema, normalizeSignature, signatureReasonablyMatches } from "./validation";
import { buildAcceptanceSummaryHtml } from "./summary";

describe("proposal tokens", () => {
  it("generates unique unguessable tokens and stable hashes", () => {
    const first = generateProposalToken();
    const second = generateProposalToken();

    expect(first).not.toEqual(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashProposalToken(first)).toHaveLength(64);
    expect(hashProposalToken(first)).toEqual(hashProposalToken(first));
  });

  it("detects expiration, revocation, and redacts raw tokens", () => {
    expect(isTokenExpired({ tokenExpiresAt: new Date("2026-01-01"), expiresAt: null }, new Date("2026-07-21"))).toBe(true);
    expect(isTokenExpired({ tokenExpiresAt: new Date("2026-12-31"), expiresAt: null }, new Date("2026-07-21"))).toBe(false);
    expect(isTokenRevoked({ tokenRevokedAt: new Date() })).toBe(true);
    expect(redactProposalToken("abcdefghijklmnopqrstuvwxyz")).toBe("[redacted:uvwxyz]");
  });
});

describe("proposal availability", () => {
  it("allows sent public proposals and safely rejects unavailable states", () => {
    const proposal = getFixtureProposalByToken(grayMattersDevelopmentToken);
    expect(proposal).not.toBeNull();

    expect(availabilityFromProposal(proposal).status).toBe("available");
    expect(availabilityFromProposal({ ...proposal!, isPublic: false }).status).toBe("unavailable");
    expect(availabilityFromProposal({ ...proposal!, status: "DRAFT" }).status).toBe("unavailable");
    expect(availabilityFromProposal({ ...proposal!, tokenRevokedAt: new Date() }).status).toBe("unavailable");
    expect(availabilityFromProposal({ ...proposal!, expiresAt: new Date("2026-01-01"), tokenExpiresAt: null }).status).toBe("expired");
  });
});

describe("proposal transitions", () => {
  it("supports the Phase 2 path and rejects invalid transitions", () => {
    expect(canTransitionProposal("DRAFT", "SENT")).toBe(true);
    expect(canTransitionProposal("SENT", "VIEWED")).toBe(true);
    expect(canTransitionProposal("VIEWED", "APPROVED")).toBe(true);
    expect(canTransitionProposal("APPROVED", "SIGNATURE_PENDING")).toBe(true);
    expect(canTransitionProposal("SIGNATURE_PENDING", "PAYMENT_PENDING")).toBe(true);
    expect(canTransitionProposal("DRAFT", "PAYMENT_PENDING")).toBe(false);
    expect(canTransitionProposal("EXPIRED", "APPROVED")).toBe(false);
    expect(canTransitionProposal("CANCELLED", "VIEWED")).toBe(false);
  });
});

describe("signatory validation", () => {
  it("normalizes signatures without being case or punctuation sensitive", () => {
    expect(normalizeSignature("  Jane Q. Client ")).toBe("jane q client");
    expect(signatureReasonablyMatches("Jane Q. Client", "jane client")).toBe(true);
    expect(signatureReasonablyMatches("Jane Q. Client", "Someone Else")).toBe(false);
  });

  it("requires all active confirmations", () => {
    const parsed = acceptanceSchema.safeParse({
      token: grayMattersDevelopmentToken,
      idempotencyKey: "idempotency-key-for-test",
      signerName: "Jane Q. Client",
      signerTitle: "Owner",
      signerEmail: "jane@example.com",
      typedSignature: "Jane Client",
      authorizedApproval: "on",
      reviewedScope: "on",
      acceptedPaymentSchedule: "on",
      acceptedTerms: "on",
    });

    expect(parsed.success).toBe(true);
  });
});

describe("snapshots and hashes", () => {
  it("serializes canonically and changes hashes when proposal content changes", () => {
    const proposal = getFixtureProposalByToken(grayMattersDevelopmentToken)!;
    const acceptedAt = new Date("2026-07-21T12:00:00.000Z");
    const snapshot = createProposalSnapshot(
      proposal,
      {
        fullName: "Jane Client",
        title: "Owner",
        email: "jane@example.com",
        typedSignature: "Jane Client",
      },
      acceptedAt,
    );
    const hash = hashCanonical(proposalContentForHash(snapshot));
    const changedHash = hashCanonical(proposalContentForHash({ ...snapshot, terms: "Changed terms" }));

    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(hash).toHaveLength(64);
    expect(changedHash).not.toEqual(hash);
  });

  it("generates a summary from the stored snapshot fields", () => {
    const proposal = getFixtureProposalByToken(grayMattersDevelopmentToken)!;
    const snapshot = createProposalSnapshot(
      proposal,
      {
        fullName: "Jane Client",
        title: "Owner",
        email: "jane@example.com",
        typedSignature: "Jane Client",
      },
      new Date("2026-07-21T12:00:00.000Z"),
    );
    const html = buildAcceptanceSummaryHtml({
      id: "acceptance",
      proposalId: proposal.id,
      organizationId: proposal.organizationId,
      signerName: "Jane Client",
      signerTitle: "Owner",
      signerEmail: "jane@example.com",
      typedSignature: "Jane Client",
      authorizedApproval: true,
      reviewedScope: true,
      acceptedPaymentSchedule: true,
      acceptedTerms: true,
      note: null,
      purchaseOrderNumber: null,
      proposalVersion: 1,
      proposalVersionLabel: "v1",
      proposalSnapshot: snapshot,
      proposalContentHash: "a".repeat(64),
      acceptancePayloadHash: "b".repeat(64),
      acceptanceHash: "c".repeat(64),
      ipAddress: null,
      userAgent: null,
      requestId: "request",
      idempotencyKey: "idem",
      acceptedAt: new Date("2026-07-21T12:00:00.000Z"),
      createdAt: new Date("2026-07-21T12:00:00.000Z"),
    });

    expect(html).toContain("Proposal Acceptance Summary");
    expect(html).toContain("Gray Matters Technology");
    expect(html).toContain("Proposal content hash");
  });
});
