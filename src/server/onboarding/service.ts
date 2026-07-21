import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";

export async function getProjectOnboardingWorkspace(
  projectId: string,
  organizationId: string,
  db: PrismaClient = getDb(),
) {
  return db.onboardingForm.findFirst({
    where: { projectId, organizationId },
    include: {
      template: { include: { questions: { orderBy: { sortOrder: "asc" } } } },
      responses: true,
      files: { orderBy: { createdAt: "desc" } },
    },
  });
}

export function calculateOnboardingCompletion(input: {
  questions: { fieldKey: string; required: boolean }[];
  responses: { fieldKey: string; value: unknown }[];
}) {
  const required = input.questions.filter((question) => question.required);
  if (!required.length) {
    return 100;
  }

  const responseMap = new Map(
    input.responses.map((response) => [response.fieldKey, response.value]),
  );
  const completed = required.filter((question) =>
    hasResponseValue(responseMap.get(question.fieldKey)),
  ).length;
  return Math.round((completed / required.length) * 100);
}

export function assertOnboardingComplete(input: {
  questions: { fieldKey: string; required: boolean; prompt: string }[];
  responses: { fieldKey: string; value: unknown }[];
}) {
  const responseMap = new Map(
    input.responses.map((response) => [response.fieldKey, response.value]),
  );
  const missing = input.questions
    .filter(
      (question) =>
        question.required &&
        !hasResponseValue(responseMap.get(question.fieldKey)),
    )
    .map((question) => question.prompt);

  if (missing.length) {
    throw new Error(
      `Missing required onboarding fields: ${missing.join(", ")}`,
    );
  }
}

function hasResponseValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object" && "files" in value) {
    return (
      Array.isArray((value as { files?: unknown }).files) &&
      (value as { files: unknown[] }).files.length > 0
    );
  }

  return value !== null && value !== undefined;
}
