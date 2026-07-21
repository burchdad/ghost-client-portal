import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getAppEnvironment, validateRuntimeEnvironment } from "@/server/env";
import { inspectProposalLifecycle } from "@/server/integrity/service";
import {
  detectPlaceholders,
  isDevelopmentTokenHint,
} from "@/server/placeholders";

export type ReadinessStatus =
  "READY" | "WARNING" | "BLOCKED" | "NOT_APPLICABLE";
export type LaunchGateStatus = "GO" | "REVIEW REQUIRED" | "NO-GO";

export type ReadinessCheck = {
  category: string;
  label: string;
  status: ReadinessStatus;
  message: string;
};

export async function getLaunchReadiness(input: {
  organizationId: string;
  proposalId?: string | null;
  db?: PrismaClient;
}) {
  const db = input.db ?? getDb();
  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    include: {
      primaryContact: true,
      billingContact: true,
      contacts: true,
      projects: {
        where: { deletedAt: null },
        include: {
          phases: true,
          milestones: true,
          clientActions: true,
          payments: true,
        },
      },
      proposals: {
        where: input.proposalId ? { id: input.proposalId } : undefined,
        include: {
          acceptances: true,
          paymentSchedule: true,
          payments: true,
          projects: true,
        },
        orderBy: { createdAt: "desc" },
        take: input.proposalId ? undefined : 1,
      },
      invitations: { orderBy: { createdAt: "desc" } },
      migrationConfirmations: {
        where: { environment: "production" },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      launchReviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const proposal = organization.proposals[0] ?? null;
  const project = organization.projects[0] ?? null;
  const onboardingForms = project
    ? await db.onboardingForm.findMany({
        where: { organizationId: organization.id, projectId: project.id },
        select: { id: true, templateId: true, submittedAt: true },
      })
    : [];
  const primary =
    organization.primaryContact ??
    organization.contacts.find((contact) => contact.isPrimary) ??
    organization.contacts[0] ??
    null;
  const env = validateRuntimeEnvironment({
    requireProductionSecrets: getAppEnvironment() === "production",
  });
  const checks: ReadinessCheck[] = [];

  for (const finding of env.findings) {
    checks.push({
      category: "Environment",
      label: finding.message,
      status: finding.status,
      message: finding.message,
    });
  }

  checks.push({
    category: "Environment",
    label: "APP_ENV explicitly set",
    status: process.env.APP_ENV ? "READY" : "WARNING",
    message: process.env.APP_ENV
      ? `APP_ENV=${process.env.APP_ENV}`
      : "APP_ENV is not explicitly set; inferred environment is being used.",
  });

  const placeholders = detectPlaceholders({
    organizationName: organization.name,
    primaryContactName: primary?.name,
    primaryContactEmail: primary?.email,
    primaryContactTitle: primary?.title,
    billingContactName: organization.billingContact?.name,
    billingContactEmail: organization.billingContact?.email,
  });

  checks.push({
    category: "Client identity",
    label: "Placeholder client data",
    status: placeholders.length ? "BLOCKED" : "READY",
    message: placeholders.length
      ? `Placeholder data remains: ${placeholders.map((item) => item.field).join(", ")}.`
      : "No known placeholder client identity values detected.",
  });

  checks.push({
    category: "Client identity",
    label: "Billing contact",
    status: organization.billingContact ? "READY" : "WARNING",
    message: organization.billingContact
      ? "Billing contact is configured."
      : "Billing contact is not configured.",
  });

  if (!proposal) {
    checks.push({
      category: "Proposal",
      label: "Proposal exists",
      status: "BLOCKED",
      message: "No proposal is available for launch review.",
    });
  } else {
    const integrityWarnings = inspectProposalLifecycle(proposal);
    checks.push({
      category: "Proposal",
      label: "Proposal published",
      status: proposal.isPublic ? "READY" : "BLOCKED",
      message: proposal.isPublic
        ? "Proposal is public."
        : "Proposal is not published.",
    });
    checks.push({
      category: "Proposal",
      label: "Proposal expiration",
      status:
        proposal.expiresAt && proposal.expiresAt <= new Date()
          ? "BLOCKED"
          : "READY",
      message:
        proposal.expiresAt && proposal.expiresAt <= new Date()
          ? "Proposal is expired."
          : "Proposal is not expired.",
    });
    checks.push({
      category: "Proposal",
      label: "Secure proposal token",
      status: isDevelopmentTokenHint(proposal.publicTokenHint)
        ? "BLOCKED"
        : "READY",
      message: isDevelopmentTokenHint(proposal.publicTokenHint)
        ? "Proposal still appears to use a development or seeded token hint."
        : "No development token marker detected in the token hint.",
    });
    checks.push({
      category: "Proposal",
      label: "Lifecycle integrity",
      status: integrityWarnings.some(
        (warning) => warning.severity === "critical",
      )
        ? "BLOCKED"
        : integrityWarnings.length
          ? "WARNING"
          : "READY",
      message: integrityWarnings.length
        ? integrityWarnings.map((warning) => warning.message).join(" ")
        : "No lifecycle integrity warnings detected.",
    });
  }

  const payment = proposal?.payments[0] ?? null;
  const activeAcceptances =
    proposal?.acceptances.filter((acceptance) => !acceptance.invalidatedAt) ??
    [];
  const latestLaunchReview = organization.launchReviews[0] ?? null;
  const migrationConfirmed = organization.migrationConfirmations.some(
    (confirmation) => confirmation.result === "APPLIED",
  );

  checks.push({
    category: "Migration",
    label: "Production backup and migration confirmation",
    status: migrationConfirmed ? "READY" : "BLOCKED",
    message: migrationConfirmed
      ? "A production migration confirmation has been recorded."
      : "Production backup/migration confirmation has not been recorded.",
  });

  checks.push({
    category: "Payment",
    label: "Existing Checkout Session reviewed",
    status: payment?.stripeCheckoutId
      ? payment.checkoutDisposition
        ? "READY"
        : "BLOCKED"
      : "NOT_APPLICABLE",
    message: payment?.stripeCheckoutId
      ? payment.checkoutDisposition
        ? `Existing Checkout Session disposition: ${payment.checkoutDisposition}.`
        : "Existing Stripe Checkout Session detected. Review and disposition it before creating any replacement session."
      : "No existing Checkout Session requires review.",
  });
  checks.push({
    category: "Payment",
    label: "Payment schedule",
    status: proposal?.paymentSchedule.length ? "READY" : "BLOCKED",
    message: proposal?.paymentSchedule.length
      ? "Payment schedule is present."
      : "Payment schedule is missing.",
  });
  checks.push({
    category: "Payment",
    label: "No confirmed payment",
    status: proposal?.payments.some((item) => item.status === "PAID")
      ? "BLOCKED"
      : "READY",
    message: proposal?.payments.some((item) => item.status === "PAID")
      ? "A confirmed payment exists; launch reset actions are disabled."
      : "No confirmed payment exists.",
  });
  checks.push({
    category: "Payment",
    label: "Gray Matters payment amount",
    status:
      proposal?.totalCents === 150000 &&
      proposal.paymentSchedule.some(
        (item) => item.paymentType === "DEPOSIT" && item.amountCents === 75000,
      ) &&
      proposal.paymentSchedule.some(
        (item) =>
          item.paymentType === "REMAINING_BALANCE" &&
          item.amountCents === 75000,
      )
        ? "READY"
        : "BLOCKED",
    message:
      proposal?.totalCents === 150000
        ? "Total is $1,500; deposit/final balance should each be $750."
        : "Gray Matters total investment must be $1,500.",
  });

  checks.push({
    category: "Proposal",
    label: "Acceptance record disposition",
    status: activeAcceptances.length
      ? "BLOCKED"
      : proposal
        ? "READY"
        : "BLOCKED",
    message: activeAcceptances.length
      ? "A seeded/test acceptance still appears active and must be invalidated or explicitly approved."
      : "No active seeded/test acceptance remains.",
  });

  checks.push({
    category: "Portal",
    label: "Project visibility",
    status: project?.portalVisible ? "READY" : "BLOCKED",
    message: project?.portalVisible
      ? "Project is client visible."
      : "No client-visible project found.",
  });
  checks.push({
    category: "Portal",
    label: "Project phases",
    status: project?.phases.length ? "READY" : "BLOCKED",
    message: project?.phases.length
      ? "Project phases are configured."
      : "Project phases are missing.",
  });
  checks.push({
    category: "Portal",
    label: "Onboarding template",
    status: onboardingForms.length ? "READY" : "BLOCKED",
    message: onboardingForms.length
      ? "Onboarding form is assigned."
      : "Onboarding form is missing.",
  });
  checks.push({
    category: "Portal",
    label: "Client actions",
    status: project?.clientActions.length ? "READY" : "BLOCKED",
    message: project?.clientActions.length
      ? "Client actions are configured."
      : "Client actions are missing.",
  });
  checks.push({
    category: "Invitation",
    label: "Invitation ready",
    status: organization.invitations.some(
      (invite) =>
        !invite.revokedAt &&
        !invite.acceptedAt &&
        invite.status === "REVIEWED" &&
        invite.expiresAt > new Date(),
    )
      ? "READY"
      : "WARNING",
    message:
      "Create and review an invitation only after all blocking launch checks are resolved.",
  });

  return {
    organization,
    proposal,
    project,
    latestLaunchReview,
    checks,
    overallStatus: summarize(checks),
    launchStatus: summarizeLaunchGate(checks, latestLaunchReview?.finalStatus),
  };
}

function summarize(checks: ReadinessCheck[]): ReadinessStatus {
  if (checks.some((check) => check.status === "BLOCKED")) {
    return "BLOCKED";
  }

  if (checks.some((check) => check.status === "WARNING")) {
    return "WARNING";
  }

  return "READY";
}

export { summarize as summarizeReadiness };

export function summarizeLaunchGate(
  checks: ReadinessCheck[],
  latestReviewStatus?: string | null,
): LaunchGateStatus {
  if (checks.some((check) => check.status === "BLOCKED")) {
    return "NO-GO";
  }

  if (latestReviewStatus === "GO") {
    return "GO";
  }

  return "REVIEW REQUIRED";
}
