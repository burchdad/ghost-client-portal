import type { Payment, Prisma, Proposal } from "@prisma/client";
import { ensureOnboardingForProject } from "@/server/onboarding/activation";

const logoRebrandPhases = [
  "Brand Discovery",
  "Creative Direction",
  "Initial Concepts",
  "Client Review",
  "Revisions",
  "Final Approval",
  "Asset Delivery",
];

export async function activateProjectForDeposit(
  tx: Prisma.TransactionClient,
  input: { proposal: Proposal; payment: Payment },
) {
  const existing = await tx.project.findFirst({
    where: { proposalId: input.proposal.id, deletedAt: null },
  });

  const project =
    existing ??
    (await tx.project.create({
      data: {
        organizationId: input.proposal.organizationId,
        proposalId: input.proposal.id,
        projectOwnerId: input.proposal.internalOwnerId,
        name: input.proposal.title,
        serviceCategory: "Logo Rebrand",
        startDate: new Date(),
        currentPhase: "Brand Discovery",
        status: "ONBOARDING",
        progress: 5,
        contractValueCents: input.proposal.totalCents,
        amountPaidCents: input.payment.amountCents,
        remainingBalanceCents: Math.max(input.proposal.totalCents - input.payment.amountCents, 0),
        clientVisibleSummary: input.proposal.executiveSummary,
        portalVisible: true,
      },
    }));

  const activated = await tx.project.update({
    where: { id: project.id },
    data: {
      status: "ONBOARDING",
      startDate: project.startDate ?? new Date(),
      amountPaidCents: input.payment.amountCents,
      remainingBalanceCents: Math.max(input.proposal.totalCents - input.payment.amountCents, 0),
    },
  });

  if (!existing) {
    await tx.projectPhase.createMany({
      data: logoRebrandPhases.map((name, index) => ({
        projectId: activated.id,
        name,
        sortOrder: index + 1,
        status: index === 0 ? "Active" : "Planned",
      })),
    });

    await tx.milestone.createMany({
      data: [
        "Complete Brand Discovery Questionnaire",
        "Upload Current Logo Files",
        "Upload Brand Reference Material",
        "Confirm Final Decision-Makers",
      ].map((name) => ({
        projectId: activated.id,
        name,
        status: "Waiting on Client",
      })),
    });

    await tx.outboxEvent.create({
      data: {
        eventType: "project.created",
        aggregateType: "Project",
        aggregateId: activated.id,
        payload: { organizationId: activated.organizationId, proposalId: input.proposal.id },
      },
    });
  }

  await ensureOnboardingForProject(tx, {
    organizationId: activated.organizationId,
    projectId: activated.id,
    serviceCategory: activated.serviceCategory,
  });

  await tx.outboxEvent.create({
    data: {
      eventType: "project.activated",
      aggregateType: "Project",
      aggregateId: activated.id,
      payload: { organizationId: activated.organizationId, proposalId: input.proposal.id },
    },
  });

  return activated;
}
