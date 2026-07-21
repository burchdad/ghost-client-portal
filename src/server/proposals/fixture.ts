import { hashProposalToken } from "./tokens";
import type { ProposalWithPublicRelations } from "./types";

export const grayMattersDevelopmentToken =
  "gray-matters-logo-rebrand-seed-token";
export const grayMattersAcceptedPaymentToken =
  "gray-matters-logo-rebrand-accepted-token";

export function getFixtureProposalByToken(
  token: string,
): ProposalWithPublicRelations | null {
  if (
    token !== grayMattersDevelopmentToken &&
    token !== grayMattersAcceptedPaymentToken
  ) {
    return null;
  }

  const now = new Date("2026-07-21T12:00:00.000Z");
  const accepted = token === grayMattersAcceptedPaymentToken;
  const organization = {
    id: "fixture-gray-matters",
    name: "Gray Matters Technology",
    slug: "gray-matters-technology",
    accountStatus: "ACTIVE" as const,
    primaryContactId: null,
    billingContactId: null,
    isTestRecord: false,
    testRunId: null,
    stripeCustomerId: null,
    stripeCustomerCreatedAt: null,
    stripeCustomerSyncedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return {
    id: "fixture-gray-proposal",
    organizationId: organization.id,
    primaryContactId: "fixture-contact",
    templateId: "fixture-template",
    internalOwnerId: "fixture-founder",
    title: "Logo Rebrand and Brand Identity Refresh",
    proposalNumber: "GCP-2026-0001",
    publicTokenHash: hashProposalToken(token),
    publicTokenHint: token.slice(-8),
    tokenExpiresAt: new Date("2026-12-31T23:59:59.000Z"),
    tokenRevokedAt: null,
    isTestRecord: false,
    testRunId: null,
    isPublic: true,
    sentAt: now,
    executiveSummary:
      "Ghost AI Solutions will refresh the Gray Matters Technology visual identity with a versatile logo system and concise brand guide.",
    objectives:
      "Create a polished identity system that feels trustworthy, technology-forward, and ready for digital and print use.",
    scopeOfWork:
      "Discovery, concept direction, logo refinement, production exports, color palette, typography recommendations, and mini brand guide.",
    exclusions:
      "Full website redesign, naming, trademark search, paid font licensing, and extended campaign collateral are excluded unless added by change order.",
    timeline:
      "Estimated two to three week delivery after onboarding materials are complete.",
    pricingSummary:
      "Total investment is $1,500 with a $750 deposit and $750 final payment due upon completion and approval.",
    terms:
      "Client approval and payment milestones are required before activation and final asset delivery.",
    totalCents: 150000,
    currency: "usd",
    clientSignatory: null,
    status: accepted ? "PAYMENT_PENDING" : "SENT",
    viewedAt: accepted ? now : null,
    acceptedAt: accepted ? now : null,
    signedAt: accepted ? now : null,
    paidAt: null,
    expiresAt: new Date("2026-12-31T23:59:59.000Z"),
    lastViewedAt: null,
    viewCount: 0,
    version: 1,
    versionLabel: "v1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    organization,
    sections: [],
    deliverables: [
      "Primary logo",
      "Secondary logo",
      "Horizontal logo",
      "Stacked logo",
      "Icon mark",
      "Black logo version",
      "White logo version",
      "SVG files",
      "PNG files",
      "PDF files",
      "Color palette",
      "Typography recommendations",
      "Mini brand guide",
      "Social profile versions",
      "Favicon",
    ].map((name, index) => ({
      id: `fixture-deliverable-${index}`,
      proposalId: "fixture-gray-proposal",
      name,
      description: null,
      sortOrder: index + 1,
    })),
    addOns: [],
    paymentSchedule: [
      {
        id: "fixture-deposit",
        organizationId: organization.id,
        proposalId: "fixture-gray-proposal",
        projectId: null,
        label: "Deposit",
        description: "Deposit due after proposal acceptance.",
        paymentType: "DEPOSIT",
        amountCents: 75000,
        currency: "usd",
        dueOn: null,
        status: "PENDING",
        stripeCheckoutId: null,
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        paidAt: null,
        failedAt: null,
        refundedAmountCents: 0,
        metadata: null,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "fixture-final",
        organizationId: organization.id,
        proposalId: "fixture-gray-proposal",
        projectId: null,
        label: "Final payment",
        description: "Final payment due upon completion and approval.",
        paymentType: "REMAINING_BALANCE",
        amountCents: 75000,
        currency: "usd",
        dueOn: null,
        status: "PENDING",
        stripeCheckoutId: null,
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        paidAt: null,
        failedAt: null,
        refundedAmountCents: 0,
        metadata: null,
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
    acceptances: accepted
      ? [
          {
            id: "fixture-acceptance",
            proposalId: "fixture-gray-proposal",
            organizationId: organization.id,
            signerName: "Gray Matters Primary Contact",
            signerTitle: "Owner",
            signerEmail: "client@example.com",
            typedSignature: "Gray Matters Primary Contact",
            authorizedApproval: true,
            reviewedScope: true,
            acceptedPaymentSchedule: true,
            acceptedTerms: true,
            note: null,
            purchaseOrderNumber: null,
            proposalVersion: 1,
            proposalVersionLabel: "v1",
            proposalSnapshot: {},
            proposalContentHash: "a".repeat(64),
            acceptancePayloadHash: "b".repeat(64),
            acceptanceHash: "c".repeat(64),
            invalidatedAt: null,
            invalidatedById: null,
            invalidationReason: null,
            invalidationType: null,
            ipAddress: null,
            userAgent: null,
            requestId: "fixture-request",
            idempotencyKey: "fixture-idempotency",
            acceptedAt: now,
            createdAt: now,
          },
        ]
      : [],
  };
}
