import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { getEmailProvider } from "@/server/email/provider";
import { createInvitation } from "@/server/invitations/service";
import { ensureOnboardingForProject } from "@/server/onboarding/activation";
import {
  generateProposalToken,
  hashProposalToken,
} from "@/server/proposals/tokens";

export const TEST_ORGANIZATION_NAME =
  process.env.PORTAL_TEST_ORGANIZATION_NAME ??
  "Ghost Client Portal Test Company";
export const TEST_PROJECT_NAME = "Test Brand Identity Project";
export const TEST_PROPOSAL_TITLE = "Client Portal End-to-End Test Proposal";
export const SEND_TEST_PROPOSAL_CONFIRMATION = "SEND TEST PROPOSAL";
export const CREATE_TEST_INVITATION_CONFIRMATION = "CREATE TEST INVITATION";
export const SEND_TEST_INVITATION_CONFIRMATION = "SEND TEST INVITATION";
export const DELETE_TEST_RUN_CONFIRMATION = "DELETE TEST RUN";

export function getConfiguredTestClient() {
  const email = process.env.PORTAL_TEST_CLIENT_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      "PORTAL_TEST_CLIENT_EMAIL is required for lifecycle testing.",
    );
  }

  if (email.endsWith("@example.com")) {
    throw new Error("PORTAL_TEST_CLIENT_EMAIL cannot use example.com.");
  }

  return {
    email,
    name: process.env.PORTAL_TEST_CLIENT_NAME?.trim() || "Stephen Burch",
    title: process.env.PORTAL_TEST_CLIENT_TITLE?.trim() || "Test Client",
    organizationName:
      process.env.PORTAL_TEST_ORGANIZATION_NAME?.trim() ||
      TEST_ORGANIZATION_NAME,
  };
}

export async function getLatestTestRun(db: PrismaClient = getDb()) {
  const client = getConfiguredTestClient();
  return db.testRun.findFirst({
    where: {
      clientEmail: client.email,
      cleanupAt: null,
    },
    include: {
      organizations: true,
      proposals: {
        include: {
          acceptances: true,
          paymentSchedule: true,
          payments: true,
          projects: true,
        },
      },
      projects: { include: { phases: true, clientActions: true } },
      invitations: true,
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function createOrReuseTestRun(input: {
  actorUserId: string;
  forceNew?: boolean;
  db?: PrismaClient;
}) {
  const db = input.db ?? getDb();
  const client = getConfiguredTestClient();
  const existing = input.forceNew ? null : await getLatestTestRun(db);

  if (existing && existing.status !== "CLEANUP_REQUIRED") {
    return { run: existing, proposalToken: null };
  }

  const testRunId = `portal-test-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8)}`;
  const token = generateProposalToken();
  const now = new Date();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  const run = await db.$transaction(async (tx) => {
    const testRun = await tx.testRun.create({
      data: {
        id: testRunId,
        status: "IN_PROGRESS",
        clientEmail: client.email,
        clientName: client.name,
        clientTitle: client.title,
        organizationName: client.organizationName,
        proposalTokenHash: hashProposalToken(token),
        proposalTokenHint: token.slice(-8),
        createdById: input.actorUserId,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: client.organizationName,
        slug: `${testRunId}-company`,
        accountStatus: "INVITED",
        isTestRecord: true,
        testRunId,
      },
    });

    const contact = await tx.contact.create({
      data: {
        organizationId: organization.id,
        name: client.name,
        title: client.title,
        email: client.email,
        isPrimary: true,
        isPrimaryApprover: true,
        preferredCommunicationMethod: "Email",
        isTestRecord: true,
        testRunId,
      },
    });

    await tx.organization.update({
      where: { id: organization.id },
      data: { primaryContactId: contact.id, billingContactId: contact.id },
    });

    const proposal = await tx.proposal.create({
      data: {
        organizationId: organization.id,
        primaryContactId: contact.id,
        internalOwnerId: input.actorUserId,
        title: TEST_PROPOSAL_TITLE,
        proposalNumber: `TEST-${Date.now()}`,
        publicTokenHash: hashProposalToken(token),
        publicTokenHint: token.slice(-8),
        isTestRecord: true,
        testRunId,
        tokenExpiresAt: expiresAt,
        expiresAt,
        isPublic: true,
        sentAt: now,
        executiveSummary:
          "This is a controlled Ghost Client Portal test proposal and does not represent a real commercial agreement.",
        objectives:
          "Exercise proposal viewing, acceptance, signature, payment-page review, invitation, dashboard, and onboarding flows.",
        scopeOfWork:
          "Test brand discovery, test logo direction, test typography selection, test color palette, and test brand guide delivery.",
        exclusions:
          "This test proposal excludes real client work, real deliverables, and any obligation to complete a live Stripe charge.",
        timeline: "Test timeline only. No real delivery commitment.",
        pricingSummary:
          "Test total is $100 with a $50 deposit and $50 final balance.",
        terms:
          "Testing only. This proposal does not represent a real commercial agreement or charge authorization.",
        totalCents: 10000,
        currency: "usd",
        status: "SENT",
        sections: {
          create: [
            {
              title: "Test Notice",
              body: "This is a controlled Ghost Client Portal test proposal and does not represent a real commercial agreement.",
              sortOrder: 1,
            },
            {
              title: "Scope",
              body: "Test brand discovery, logo direction, typography, color palette, and mini brand guide delivery.",
              sortOrder: 2,
            },
          ],
        },
        deliverables: {
          create: [
            "Primary test logo",
            "Secondary test logo",
            "Test icon mark",
            "Test color palette",
            "Test typography recommendations",
            "Test mini brand guide",
          ].map((name, index) => ({ name, sortOrder: index + 1 })),
        },
        paymentSchedule: {
          create: [
            {
              organizationId: organization.id,
              label: "Test deposit",
              description: "Test deposit for payment page validation.",
              amountCents: 5000,
              paymentType: "DEPOSIT",
              currency: "usd",
              sortOrder: 1,
            },
            {
              organizationId: organization.id,
              label: "Test final balance",
              description: "Test final balance for lifecycle validation.",
              amountCents: 5000,
              paymentType: "REMAINING_BALANCE",
              currency: "usd",
              sortOrder: 2,
            },
          ],
        },
      },
    });

    const project = await tx.project.create({
      data: {
        organizationId: organization.id,
        proposalId: proposal.id,
        projectOwnerId: input.actorUserId,
        isTestRecord: true,
        testRunId,
        name: TEST_PROJECT_NAME,
        serviceCategory: "Logo Rebrand",
        currentPhase: "Brand Discovery",
        status: "PENDING_PAYMENT",
        progress: 0,
        contractValueCents: 10000,
        amountPaidCents: 0,
        remainingBalanceCents: 10000,
        clientVisibleSummary:
          "Controlled test project for client portal validation.",
        portalVisible: true,
      },
    });

    await tx.projectPhase.createMany({
      data: [
        "Brand Discovery",
        "Creative Direction",
        "Initial Concepts",
        "Client Review",
      ].map((name, index) => ({
        projectId: project.id,
        name,
        sortOrder: index + 1,
        status: index === 0 ? "Waiting on Client" : "Not Started",
        progress: index === 0 ? 10 : 0,
        clientVisibleDescription: `${name} test phase.`,
      })),
    });

    await ensureOnboardingForProject(tx, {
      organizationId: organization.id,
      projectId: project.id,
      serviceCategory: "Logo Rebrand",
    });
    const onboarding = await tx.onboardingForm.findFirst({
      where: { projectId: project.id },
    });

    await tx.clientAction.createMany({
      data: [
        {
          title: "Complete Test Brand Discovery Questionnaire",
          description: "Complete the test onboarding form.",
          category: "ONBOARDING",
          priority: "HIGH",
          relatedOnboardingFormId: onboarding?.id,
        },
        {
          title: "Review Test Proposal Payment Page",
          description:
            "Open the payment page but do not complete a live charge in production.",
          category: "PAYMENT",
          priority: "NORMAL",
          relatedOnboardingFormId: null,
        },
      ].map((action) => ({
        organizationId: organization.id,
        projectId: project.id,
        title: action.title,
        description: action.description,
        category: action.category as "ONBOARDING" | "PAYMENT",
        priority: action.priority as "HIGH" | "NORMAL",
        status: "PENDING" as const,
        relatedOnboardingFormId: action.relatedOnboardingFormId ?? null,
        clientVisibleInstructions: `${action.description} Test data only.`,
      })),
    });

    await tx.testRun.update({
      where: { id: testRun.id },
      data: { proposalId: proposal.id, projectId: project.id },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: "test_run.created",
        entityType: "TestRun",
        entityId: testRunId,
        metadata: {
          organizationId: organization.id,
          proposalId: proposal.id,
          projectId: project.id,
        },
      },
    });

    await tx.outboxEvent.create({
      data: {
        eventType: "test_run.created",
        aggregateType: "TestRun",
        aggregateId: testRunId,
        payload: {
          testRunId,
          organizationId: organization.id,
          proposalId: proposal.id,
        },
      },
    });

    return tx.testRun.findUnique({
      where: { id: testRunId },
      include: {
        organizations: true,
        proposals: {
          include: {
            acceptances: true,
            paymentSchedule: true,
            payments: true,
            projects: true,
          },
        },
        projects: { include: { phases: true, clientActions: true } },
        invitations: true,
      },
    });
  });

  return { run, proposalToken: token };
}

export function proposalEmail(input: { url: string; testRunId: string }) {
  const client = getConfiguredTestClient();
  return {
    subject: "Ghost Client Portal test proposal",
    html: `<p>Hi ${client.name},</p><p>This is the controlled end-to-end test of the Ghost AI Solutions Client Portal.</p><p><a href="${input.url}">Review the fake test proposal</a></p><p>This proposal is for testing only and does not represent a real charge or commercial agreement.</p><p>Test run: ${input.testRunId}</p>`,
  };
}

export function invitationEmail(input: { url: string; testRunId: string }) {
  const client = getConfiguredTestClient();
  return {
    subject: "Ghost Client Portal test invitation",
    html: `<p>Hi ${client.name},</p><p>This is the controlled test invitation for the Ghost AI Solutions Client Portal.</p><p><a href="${input.url}">Activate the fake test client account</a></p><p>Test data only. Test run: ${input.testRunId}</p>`,
  };
}

export async function sendTestProposal(input: {
  testRunId: string;
  proposalToken: string;
  actorUserId: string;
  confirmation: string;
  db?: PrismaClient;
}) {
  if (input.confirmation !== SEND_TEST_PROPOSAL_CONFIRMATION) {
    throw new Error(
      "Sending the test proposal requires explicit confirmation.",
    );
  }

  const db = input.db ?? getDb();
  const run = await db.testRun.findUniqueOrThrow({
    where: { id: input.testRunId },
  });
  const client = getConfiguredTestClient();
  if (
    run.clientEmail !== client.email ||
    !run.proposalTokenHash ||
    hashProposalToken(input.proposalToken) !== run.proposalTokenHash
  ) {
    throw new Error("Test run is not configured for the current test email.");
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/p/${input.proposalToken}`;
  const message = proposalEmail({ url, testRunId: run.id });
  const result = await getEmailProvider().send({
    to: client.email,
    idempotencyKey: `test-proposal:${run.id}`,
    ...message,
  });

  await db.testRun.update({
    where: { id: run.id },
    data: {
      proposalEmailSentAt: new Date(),
      proposalEmailMessageId: result.messageId ?? result.status,
    },
  });
  await db.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      eventType: "test_run.proposal_email_sent",
      entityType: "TestRun",
      entityId: run.id,
      metadata: {
        status: result.status,
        provider: result.provider,
        recipient: redactEmail(client.email),
      },
    },
  });
  return result;
}

export async function createReviewedTestInvitation(input: {
  testRunId: string;
  actorUserId: string;
  confirmation: string;
  db?: PrismaClient;
}) {
  if (input.confirmation !== CREATE_TEST_INVITATION_CONFIRMATION) {
    throw new Error(
      "Creating the test invitation requires explicit confirmation.",
    );
  }

  const db = input.db ?? getDb();
  const run = await db.testRun.findUniqueOrThrow({
    where: { id: input.testRunId },
    include: { organizations: true },
  });
  const organization = run.organizations[0];
  if (!organization?.isTestRecord) {
    throw new Error(
      "Test invitation can only be created for a marked test organization.",
    );
  }

  const { invitation, token } = await createInvitation({
    organizationId: organization.id,
    email: run.clientEmail,
    name: run.clientName,
    intendedRole: "OWNER",
    createdById: input.actorUserId,
    status: "REVIEWED",
    reviewedAt: new Date(),
    isTestRecord: true,
    testRunId: run.id,
    db,
  });

  await db.testRun.update({
    where: { id: run.id },
    data: {
      invitationId: invitation.id,
      invitationTokenHash: sha256(token),
      invitationTokenHint: token.slice(-8),
    },
  });

  return { invitation, token };
}

export async function sendTestInvitation(input: {
  testRunId: string;
  invitationToken: string;
  actorUserId: string;
  confirmation: string;
  db?: PrismaClient;
}) {
  if (input.confirmation !== SEND_TEST_INVITATION_CONFIRMATION) {
    throw new Error(
      "Sending the test invitation requires explicit confirmation.",
    );
  }

  const db = input.db ?? getDb();
  const run = await db.testRun.findUniqueOrThrow({
    where: { id: input.testRunId },
    include: { invitations: true },
  });
  const invitation = run.invitations.find(
    (item) => item.id === run.invitationId,
  );
  if (!invitation?.isTestRecord || !run.invitationTokenHash) {
    throw new Error(
      "A reviewed test invitation must be created before sending.",
    );
  }

  if (
    !input.invitationToken ||
    sha256(input.invitationToken) !== run.invitationTokenHash
  ) {
    throw new Error(
      "The one-time invitation token is required before sending.",
    );
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${input.invitationToken}`;
  const result = await getEmailProvider().send({
    to: run.clientEmail,
    idempotencyKey: `test-invitation:${run.id}`,
    ...invitationEmail({ url, testRunId: run.id }),
  });

  await db.invitation.update({
    where: { id: invitation.id },
    data: { sentAt: new Date(), status: "SENT" },
  });
  await db.testRun.update({
    where: { id: run.id },
    data: {
      invitationEmailSentAt: new Date(),
      invitationEmailMessageId: result.messageId ?? result.status,
    },
  });
  await db.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      eventType: "test_run.invitation_email_sent",
      entityType: "TestRun",
      entityId: run.id,
      metadata: {
        status: result.status,
        provider: result.provider,
        recipient: redactEmail(run.clientEmail),
      },
    },
  });
  return result;
}

export async function cleanupTestRun(input: {
  testRunId: string;
  actorUserId: string;
  confirmation: string;
  db?: PrismaClient;
}) {
  if (input.confirmation !== DELETE_TEST_RUN_CONFIRMATION) {
    throw new Error("Cleanup requires explicit confirmation.");
  }

  const db = input.db ?? getDb();
  return db.$transaction(async (tx) => {
    const run = await tx.testRun.findUniqueOrThrow({
      where: { id: input.testRunId },
      include: {
        payments: true,
        invitations: true,
        proposals: true,
        projects: true,
        organizations: true,
      },
    });

    if (
      run.payments.some(
        (payment) => payment.status === "PAID" || payment.stripePaymentIntentId,
      )
    ) {
      throw new Error(
        "Cleanup refuses to alter a test run with a confirmed live payment or PaymentIntent.",
      );
    }

    if (
      !run.organizations.every((record) => record.isTestRecord) ||
      !run.proposals.every((record) => record.isTestRecord)
    ) {
      throw new Error("Cleanup refuses records without explicit test markers.");
    }

    await tx.invitation.updateMany({
      where: { testRunId: run.id, isTestRecord: true, acceptedAt: null },
      data: { revokedAt: new Date(), status: "REVOKED" },
    });
    await tx.proposal.updateMany({
      where: { testRunId: run.id, isTestRecord: true },
      data: { tokenRevokedAt: new Date(), deletedAt: new Date() },
    });
    await tx.project.updateMany({
      where: { testRunId: run.id, isTestRecord: true },
      data: { deletedAt: new Date(), portalVisible: false },
    });
    await tx.organization.updateMany({
      where: { testRunId: run.id, isTestRecord: true },
      data: { deletedAt: new Date() },
    });
    await tx.testRun.update({
      where: { id: run.id },
      data: { status: "CLEANUP_REQUIRED", cleanupAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: "test_run.cleanup_marked",
        entityType: "TestRun",
        entityId: run.id,
        metadata: { cleanupAt: new Date().toISOString() },
      },
    });
  });
}

export function testRunStatus(
  run: Awaited<ReturnType<typeof getLatestTestRun>>,
) {
  if (!run) return "NOT STARTED";
  if (run.cleanupAt) return "CLEANUP REQUIRED";
  if (
    run.invitations.some((item) => item.acceptedAt) &&
    run.projects.some((project) =>
      project.clientActions.every((action) => action.status === "COMPLETED"),
    )
  ) {
    return "PASSED";
  }
  if (run.proposalEmailSentAt || run.invitationId) return "IN PROGRESS";
  return run.status;
}

function redactEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}
