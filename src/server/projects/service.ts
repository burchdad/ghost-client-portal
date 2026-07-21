import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { isClientSafeActivity } from "@/server/activity/client-safe";
import { amountPaid, amountRemaining } from "@/server/payments/calculations";
import { calculateProjectProgress, nextMilestone } from "./progress";

export async function getClientProjectWorkspace(
  projectId: string,
  organizationId: string,
) {
  const project = await getDb().project.findFirst({
    where: {
      id: projectId,
      organizationId,
      deletedAt: null,
      portalVisible: true,
    },
    include: {
      organization: true,
      projectOwner: true,
      proposal: true,
      phases: { orderBy: { sortOrder: "asc" }, include: { milestones: true } },
      milestones: { orderBy: [{ dueAt: "asc" }, { plannedDate: "asc" }] },
      clientActions: { orderBy: [{ priority: "desc" }, { dueAt: "asc" }] },
      payments: { orderBy: { createdAt: "desc" } },
      files: {
        where: { deletedAt: null, visibility: "CLIENT_VISIBLE" },
        orderBy: { createdAt: "desc" },
      },
      approvals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) {
    notFound();
  }

  const activity = await getDb().activityEvent.findMany({
    where: { organizationId, projectId: project.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const onboardingForms = await getDb().onboardingForm.findMany({
    where: { organizationId, projectId: project.id },
    include: { template: true, responses: true, files: true },
    orderBy: { createdAt: "desc" },
  });
  const paidCents = amountPaid(project.payments);

  return {
    project,
    calculatedProgress: calculateProjectProgress({
      phases: project.phases,
      milestones: project.milestones,
      actions: project.clientActions,
    }),
    nextMilestone: nextMilestone(project.milestones),
    paidCents,
    remainingCents: amountRemaining(project.contractValueCents, paidCents),
    safeActivity: activity.filter((item) => isClientSafeActivity(item.type)),
    onboardingForms,
  };
}
