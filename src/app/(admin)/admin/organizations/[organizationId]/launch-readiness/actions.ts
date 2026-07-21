"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalRole } from "@/lib/auth/guards";
import {
  INVALIDATE_SEEDED_ACCEPTANCE_CONFIRMATION,
  MARK_CHECKOUT_ABANDONED_CONFIRMATION,
  invalidateSeededAcceptance,
  markCheckoutSessionAbandoned,
  recordLaunchReview,
} from "@/server/launch-execution/service";

const invalidateSchema = z.object({
  organizationId: z.string().min(1),
  proposalId: z.string().min(1),
  reason: z.string().trim().min(12),
  confirmation: z.literal(INVALIDATE_SEEDED_ACCEPTANCE_CONFIRMATION),
});

const checkoutDispositionSchema = z.object({
  organizationId: z.string().min(1),
  paymentId: z.string().min(1),
  reason: z.string().trim().min(12),
  confirmation: z.literal(MARK_CHECKOUT_ABANDONED_CONFIRMATION),
});

const launchReviewSchema = z.object({
  organizationId: z.string().min(1),
  proposalId: z.string().optional(),
  reason: z.string().trim().min(12),
});

const checklistKeys = [
  "contactVerified",
  "emailVerified",
  "scopeVerified",
  "deliverablesVerified",
  "paymentScheduleVerified",
  "termsVerified",
  "expirationVerified",
  "stripeModeVerified",
  "existingCheckoutSessionReviewed",
  "tokenRotated",
  "noPlaceholdersRemain",
  "noLifecycleInconsistenciesRemain",
] as const;

export async function invalidateSeededAcceptanceAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  const parsed = invalidateSchema.parse({
    organizationId: formData.get("organizationId"),
    proposalId: formData.get("proposalId"),
    reason: formData.get("reason"),
    confirmation: formData.get("confirmation"),
  });

  await invalidateSeededAcceptance({
    proposalId: parsed.proposalId,
    actorUserId: user.id,
    actorLabel: user.email,
    reason: parsed.reason,
    confirmation: parsed.confirmation,
  });

  revalidatePath(
    `/admin/organizations/${parsed.organizationId}/launch-readiness`,
  );
}

export async function markCheckoutSessionAbandonedAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  const parsed = checkoutDispositionSchema.parse({
    organizationId: formData.get("organizationId"),
    paymentId: formData.get("paymentId"),
    reason: formData.get("reason"),
    confirmation: formData.get("confirmation"),
  });

  await markCheckoutSessionAbandoned({
    paymentId: parsed.paymentId,
    actorUserId: user.id,
    reason: parsed.reason,
    confirmation: parsed.confirmation,
  });

  revalidatePath(
    `/admin/organizations/${parsed.organizationId}/launch-readiness`,
  );
}

export async function recordLaunchReviewAction(formData: FormData) {
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
  ]);
  const parsed = launchReviewSchema.parse({
    organizationId: formData.get("organizationId"),
    proposalId: formData.get("proposalId") || undefined,
    reason: formData.get("reason"),
  });
  const checklist = Object.fromEntries(
    checklistKeys.map((key) => [key, formData.get(key) === "yes"]),
  );

  await recordLaunchReview({
    organizationId: parsed.organizationId,
    proposalId: parsed.proposalId,
    actorUserId: user.id,
    actorLabel: user.email,
    reason: parsed.reason,
    checklist,
    report: {
      organizationId: parsed.organizationId,
      proposalId: parsed.proposalId ?? null,
      recordedAt: new Date().toISOString(),
    },
  });

  revalidatePath(
    `/admin/organizations/${parsed.organizationId}/launch-readiness`,
  );
}
