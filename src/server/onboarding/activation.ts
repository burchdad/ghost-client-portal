import type { Prisma } from "@prisma/client";

export async function ensureOnboardingForProject(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; projectId: string; serviceCategory: string },
) {
  const template = await tx.onboardingTemplate.findFirst({
    where: { serviceCategory: input.serviceCategory, isActive: true },
  });

  if (!template) {
    return null;
  }

  const existing = await tx.onboardingForm.findFirst({
    where: { projectId: input.projectId, templateId: template.id },
  });

  if (existing) {
    return existing;
  }

  const form = await tx.onboardingForm.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      templateId: template.id,
      completionPercentage: 0,
    },
  });

  await tx.outboxEvent.create({
    data: {
      eventType: "onboarding.created",
      aggregateType: "OnboardingForm",
      aggregateId: form.id,
      payload: { organizationId: input.organizationId, projectId: input.projectId },
    },
  });

  return form;
}
