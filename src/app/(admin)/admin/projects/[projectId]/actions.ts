"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { calculateProjectProgress } from "@/server/projects/progress";

const projectOpsSchema = z.object({
  projectId: z.string().min(1),
  clientVisibleSummary: z.string().trim().min(10).max(600),
  projectOwnerId: z.string().optional(),
  targetCompletionDate: z.string().optional(),
});

export async function updateProjectOperationsAction(formData: FormData) {
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
    "PROJECT_MANAGER",
  ]);
  const parsed = projectOpsSchema.parse({
    projectId: formData.get("projectId"),
    clientVisibleSummary: formData.get("clientVisibleSummary"),
    projectOwnerId: formData.get("projectOwnerId") || undefined,
    targetCompletionDate: formData.get("targetCompletionDate") || undefined,
  });

  const db = getDb();
  await db.$transaction(async (tx) => {
    const project = await tx.project.findUniqueOrThrow({
      where: { id: parsed.projectId },
      include: { phases: true, milestones: true, clientActions: true },
    });
    const progress = calculateProjectProgress({
      phases: project.phases,
      milestones: project.milestones,
      actions: project.clientActions,
    });

    await tx.project.update({
      where: { id: project.id },
      data: {
        clientVisibleSummary: parsed.clientVisibleSummary,
        projectOwnerId: parsed.projectOwnerId,
        targetCompletionDate: parsed.targetCompletionDate
          ? new Date(parsed.targetCompletionDate)
          : null,
        progress,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "project.operations_updated",
        entityType: "Project",
        entityId: project.id,
        metadata: { progress },
      },
    });
  });

  revalidatePath(`/admin/projects/${parsed.projectId}`);
}
