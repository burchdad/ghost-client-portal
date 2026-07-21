"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProjectAccess } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { validateClientUpload } from "@/server/files/validation";
import {
  calculateOnboardingCompletion,
  assertOnboardingComplete,
} from "@/server/onboarding/service";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function saveOnboardingDraftAction(formData: FormData) {
  await persistOnboarding(formData, "draft");
}

export async function submitOnboardingAction(formData: FormData) {
  await persistOnboarding(formData, "submit");
}

async function persistOnboarding(formData: FormData, mode: "draft" | "submit") {
  const projectId = String(formData.get("projectId") ?? "");
  const { user, project, organization } = await requireProjectAccess(projectId);
  const limit = checkRateLimit(`onboarding:${user.id}:${projectId}`, {
    limit: 12,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    throw new Error(
      "Too many onboarding updates. Please wait a moment and try again.",
    );
  }

  const db = getDb();
  const form = await db.onboardingForm.findFirstOrThrow({
    where: { projectId: project.id, organizationId: organization.id },
    include: { template: { include: { questions: true } }, responses: true },
  });

  const fileSummariesByField = new Map<
    string,
    ReturnType<typeof validateClientUpload>[]
  >();
  await db.$transaction(async (tx) => {
    for (const question of form.template.questions) {
      if (question.fieldType === "file") {
        const files = formData
          .getAll(question.fieldKey)
          .filter(
            (value): value is File => value instanceof File && value.size > 0,
          );
        const summaries = files.map(validateClientUpload);
        fileSummariesByField.set(question.fieldKey, summaries);
        for (const file of summaries) {
          await tx.fileAsset.create({
            data: {
              organizationId: organization.id,
              projectId: project.id,
              onboardingFormId: form.id,
              uploadedById: user.id,
              name: file.name,
              category: "onboarding",
              storageKey: `pending/${organization.id}/${project.id}/${crypto.randomUUID()}-${file.name}`,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              visibility: "CLIENT_VISIBLE",
            },
          });
        }
        if (summaries.length) {
          await tx.onboardingResponse.upsert({
            where: {
              formId_fieldKey: { formId: form.id, fieldKey: question.fieldKey },
            },
            update: { value: { files: summaries } },
            create: {
              formId: form.id,
              fieldKey: question.fieldKey,
              value: { files: summaries },
            },
          });
        }
        continue;
      }

      const value = String(formData.get(question.fieldKey) ?? "").trim();
      if (value) {
        await tx.onboardingResponse.upsert({
          where: {
            formId_fieldKey: { formId: form.id, fieldKey: question.fieldKey },
          },
          update: { value },
          create: { formId: form.id, fieldKey: question.fieldKey, value },
        });
      }
    }

    const refreshedResponses = await tx.onboardingResponse.findMany({
      where: { formId: form.id },
    });
    const completionPercentage = calculateOnboardingCompletion({
      questions: form.template.questions,
      responses: refreshedResponses,
    });

    if (mode === "submit") {
      assertOnboardingComplete({
        questions: form.template.questions,
        responses: refreshedResponses,
      });
    }

    await tx.onboardingForm.update({
      where: { id: form.id },
      data: {
        completionPercentage,
        submittedAt: mode === "submit" ? new Date() : form.submittedAt,
      },
    });

    if (mode === "submit") {
      await tx.clientAction.updateMany({
        where: {
          organizationId: organization.id,
          projectId: project.id,
          relatedOnboardingFormId: form.id,
          status: { notIn: ["COMPLETED", "WAIVED"] },
        },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await tx.projectPhase.updateMany({
        where: { projectId: project.id, name: "Brand Discovery" },
        data: { status: "Completed", progress: 100, completedDate: new Date() },
      });
      await tx.activityEvent.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          type: "onboarding.submitted",
          title: "Onboarding submitted",
          body: project.name,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          eventType: "onboarding.submitted",
          entityType: "OnboardingForm",
          entityId: form.id,
          metadata: { projectId: project.id, completionPercentage },
        },
      });
      await tx.outboxEvent.create({
        data: {
          eventType: "onboarding.submitted",
          aggregateType: "OnboardingForm",
          aggregateId: form.id,
          payload: { organizationId: organization.id, projectId: project.id },
        },
      });
    }
  });

  revalidatePath(`/projects/${project.id}`);
  if (mode === "submit") {
    redirect(`/projects/${project.id}?onboarding=submitted`);
  }
  redirect(`/projects/${project.id}/onboarding?saved=1`);
}
