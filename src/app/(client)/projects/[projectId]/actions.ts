"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/server/security/rate-limit";

const approvalSchema = z.object({
  projectId: z.string().min(1),
  approvalId: z.string().min(1),
  decision: z.enum([
    "APPROVED",
    "APPROVED_WITH_MINOR_CHANGES",
    "REVISIONS_REQUESTED",
    "REJECTED",
  ]),
  feedback: z.string().trim().max(2000).optional(),
});

export async function submitApprovalDecisionAction(formData: FormData) {
  const parsed = approvalSchema.safeParse({
    projectId: formData.get("projectId"),
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
    feedback: formData.get("feedback") || undefined,
  });

  if (!parsed.success) {
    redirect("/projects?error=Approval decision could not be submitted");
  }

  const { user, organization } = await requireProjectAccess(
    parsed.data.projectId,
  );
  const limit = checkRateLimit(`approval:${user.id}`, {
    limit: 10,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    redirect(
      `/projects/${parsed.data.projectId}?error=${encodeURIComponent("Too many approval updates. Please wait a minute.")}#approvals`,
    );
  }

  const approval = await getDb().approval.findFirst({
    where: {
      id: parsed.data.approvalId,
      projectId: parsed.data.projectId,
      project: { organizationId: organization.id },
    },
    include: { deliverable: true },
  });

  if (!approval) {
    redirect(
      `/projects/${parsed.data.projectId}?error=${encodeURIComponent("That approval is not available.")}#approvals`,
    );
  }

  await getDb().$transaction(async (tx) => {
    await tx.approval.update({
      where: { id: approval.id },
      data: {
        decision: parsed.data.decision,
        feedback: parsed.data.feedback,
        decidedAt: new Date(),
      },
    });

    await tx.approvalComment.create({
      data: {
        approvalId: approval.id,
        authorId: user.id,
        category: parsed.data.decision,
        body: parsed.data.feedback || "Decision submitted from client portal.",
      },
    });

    await tx.notification.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        type: "approval.decision_submitted",
        title: "Approval decision recorded",
        body: `${approval.deliverable?.name ?? "Project approval"}: ${parsed.data.decision.replaceAll("_", " ").toLowerCase()}`,
        linkTarget: `/projects/${parsed.data.projectId}#approvals`,
      },
    });

    await tx.activityEvent.create({
      data: {
        organizationId: organization.id,
        projectId: parsed.data.projectId,
        type: "approval.decision_submitted",
        title: "Approval decision submitted",
        body: approval.deliverable?.name ?? "Project approval",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "approval.decision.submitted",
        entityType: "Approval",
        entityId: approval.id,
        metadata: {
          organizationId: organization.id,
          projectId: parsed.data.projectId,
          decision: parsed.data.decision,
        },
      },
    });
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/dashboard");
  redirect(
    `/projects/${parsed.data.projectId}?notice=${encodeURIComponent("Approval decision submitted")}#approvals`,
  );
}
