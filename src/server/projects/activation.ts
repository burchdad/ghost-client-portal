import type { Payment, Prisma, Proposal } from "@prisma/client";
import { ensureOnboardingForProject } from "@/server/onboarding/activation";

const logoRebrandPhases = [
  {
    name: "Brand Discovery",
    status: "Waiting on Client",
    progress: 10,
    description:
      "Gather current brand assets, preferences, audience details, and decision-maker context.",
  },
  {
    name: "Creative Direction",
    status: "Not Started",
    progress: 0,
    description:
      "Translate discovery inputs into a clear creative direction before concept development.",
  },
  {
    name: "Initial Concepts",
    status: "Not Started",
    progress: 0,
    description: "Prepare first-round identity concepts for client review.",
  },
  {
    name: "Client Review",
    status: "Not Started",
    progress: 0,
    description: "Review concepts and capture structured feedback.",
  },
  {
    name: "Revisions",
    status: "Not Started",
    progress: 0,
    description: "Refine the chosen direction based on approved feedback.",
  },
  {
    name: "Final Approval",
    status: "Not Started",
    progress: 0,
    description: "Confirm final logo and compact identity system.",
  },
  {
    name: "Asset Delivery",
    status: "Not Started",
    progress: 0,
    description: "Package final files and mini brand guide for client access.",
  },
];

const logoRebrandActions = [
  {
    title: "Complete Brand Discovery Questionnaire",
    description:
      "Share the brand context, audience, creative preferences, and approval details Ghost needs to begin.",
    category: "ONBOARDING" as const,
    priority: "URGENT" as const,
    instructions: "Open onboarding and complete all required discovery fields.",
  },
  {
    title: "Upload Current Logo Files",
    description:
      "Upload existing logo files, marks, or working source files if available.",
    category: "FILE_UPLOAD" as const,
    priority: "HIGH" as const,
    instructions: "SVG, PNG, JPG, PDF, AI, EPS, and ZIP files are supported.",
  },
  {
    title: "Upload Brand References",
    description:
      "Share examples of logos, colors, websites, or styles that help explain the preferred direction.",
    category: "FILE_UPLOAD" as const,
    priority: "NORMAL" as const,
    instructions: "Links and reference files are both helpful.",
  },
  {
    title: "Confirm Final Decision-Makers",
    description:
      "Confirm who can approve the final creative direction and finished logo assets.",
    category: "DECISION" as const,
    priority: "HIGH" as const,
    instructions:
      "List the primary approver and any additional decision-makers in onboarding.",
  },
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
        remainingBalanceCents: Math.max(
          input.proposal.totalCents - input.payment.amountCents,
          0,
        ),
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
      remainingBalanceCents: Math.max(
        input.proposal.totalCents - input.payment.amountCents,
        0,
      ),
    },
  });

  if (!existing) {
    await tx.projectPhase.createMany({
      data: logoRebrandPhases.map((phase, index) => ({
        projectId: activated.id,
        name: phase.name,
        sortOrder: index + 1,
        status: phase.status,
        progress: phase.progress,
        clientVisibleDescription: phase.description,
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
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      })),
    });

    await tx.outboxEvent.create({
      data: {
        eventType: "project.created",
        aggregateType: "Project",
        aggregateId: activated.id,
        payload: {
          organizationId: activated.organizationId,
          proposalId: input.proposal.id,
        },
      },
    });
  }

  await ensureOnboardingForProject(tx, {
    organizationId: activated.organizationId,
    projectId: activated.id,
    serviceCategory: activated.serviceCategory,
  });

  const onboarding = await tx.onboardingForm.findFirst({
    where: { projectId: activated.id },
  });

  for (const action of logoRebrandActions) {
    const existingAction = await tx.clientAction.findFirst({
      where: { projectId: activated.id, title: action.title },
    });

    if (!existingAction) {
      await tx.clientAction.create({
        data: {
          organizationId: activated.organizationId,
          projectId: activated.id,
          relatedOnboardingFormId:
            action.category === "ONBOARDING" ? onboarding?.id : null,
          title: action.title,
          description: action.description,
          category: action.category,
          priority: action.priority,
          status: "PENDING",
          dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          clientVisibleInstructions: action.instructions,
        },
      });
    }
  }

  await tx.outboxEvent.create({
    data: {
      eventType: "project.activated",
      aggregateType: "Project",
      aggregateId: activated.id,
      payload: {
        organizationId: activated.organizationId,
        proposalId: input.proposal.id,
      },
    },
  });

  return activated;
}
