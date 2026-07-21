"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { generateProposalToken, hashProposalToken, rotateProposalToken, revokeProposalToken } from "@/server/proposals/tokens";
import { transitionProposalStatus } from "@/server/proposals/transitions";

const createProposalSchema = z.object({
  organizationId: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().trim().min(3).max(180),
  expiresAt: z.string().optional(),
});

export async function createProposalAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR", "ACCOUNT_MANAGER", "PROJECT_MANAGER"]);
  const parsed = createProposalSchema.parse({
    organizationId: formData.get("organizationId"),
    templateId: formData.get("templateId"),
    title: formData.get("title"),
    expiresAt: formData.get("expiresAt") || undefined,
  });
  const db = getDb();
  const template = await db.proposalTemplate.findUniqueOrThrow({ where: { id: parsed.templateId } });
  const token = generateProposalToken();
  const proposalNumber = `GCP-${new Date().getFullYear()}-${Math.floor(Date.now() / 1000)}`;
  const deliverables = Array.isArray(template.defaultDeliverables)
    ? template.defaultDeliverables.filter((item): item is string => typeof item === "string")
    : [];
  const paymentSchedule = Array.isArray(template.defaultPaymentSchedule)
    ? template.defaultPaymentSchedule.filter(isPaymentTemplateItem)
    : [];

  const proposal = await db.proposal.create({
    data: {
      organizationId: parsed.organizationId,
      templateId: template.id,
      internalOwnerId: user.id,
      title: parsed.title,
      proposalNumber,
      publicTokenHash: hashProposalToken(token),
      publicTokenHint: token.slice(-8),
      tokenExpiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
      executiveSummary: template.defaultSummary ?? template.description,
      objectives: template.defaultObjectives ?? "Confirm shared objectives before publishing this proposal.",
      scopeOfWork: template.defaultScope ?? "Structured scope will be finalized before sending.",
      exclusions: template.defaultExclusions ?? "Out-of-scope work requires a separate written change order.",
      timeline: template.defaultTimeline ?? "Timeline will be confirmed before sending.",
      pricingSummary: "Pricing will be confirmed before sending.",
      terms: template.defaultTerms,
      totalCents: paymentSchedule.reduce((total, item) => total + item.amountCents, 0),
      status: "DRAFT",
      deliverables: {
        create: deliverables.map((name, index) => ({ name, sortOrder: index + 1 })),
      },
      paymentSchedule: {
        create: paymentSchedule.map((item, index) => ({
          organizationId: parsed.organizationId,
          label: item.label,
          description: item.label,
          amountCents: item.amountCents,
          paymentType: item.paymentType,
          currency: "usd",
          sortOrder: index + 1,
        })),
      },
    },
  });

  redirect(`/admin/proposals/${proposal.id}?token=${token}`);
}

export async function publishProposalAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR", "ACCOUNT_MANAGER", "PROJECT_MANAGER"]);
  const proposalId = String(formData.get("proposalId"));
  const db = getDb();
  const proposal = await db.proposal.findUniqueOrThrow({ where: { id: proposalId } });

  await db.$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id: proposalId },
      data: {
        isPublic: true,
        sentAt: proposal.sentAt ?? new Date(),
        tokenExpiresAt: proposal.tokenExpiresAt ?? proposal.expiresAt,
      },
    });

    if (proposal.status === "DRAFT") {
      await transitionProposalStatus(tx, {
        proposalId,
        organizationId: proposal.organizationId,
        from: "DRAFT",
        to: "SENT",
        actorUserId: user.id,
        actorLabel: user.email,
      });
    }
  });

  revalidatePath(`/admin/proposals/${proposalId}`);
}

export async function rotateProposalTokenAction(formData: FormData) {
  await requireInternalRole(["FOUNDER", "ADMINISTRATOR", "ACCOUNT_MANAGER", "PROJECT_MANAGER"]);
  const proposalId = String(formData.get("proposalId"));
  const expiresAtValue = formData.get("tokenExpiresAt");
  const { token } = await rotateProposalToken(
    getDb(),
    proposalId,
    typeof expiresAtValue === "string" && expiresAtValue ? new Date(expiresAtValue) : undefined,
  );

  redirect(`/admin/proposals/${proposalId}?token=${token}`);
}

export async function revokeProposalTokenAction(formData: FormData) {
  await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  const proposalId = String(formData.get("proposalId"));
  await revokeProposalToken(getDb(), proposalId);
  revalidatePath(`/admin/proposals/${proposalId}`);
}

function isPaymentTemplateItem(value: unknown): value is { label: string; amountCents: number; paymentType: "DEPOSIT" | "REMAINING_BALANCE" | "FULL" } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as { label?: unknown }).label === "string" &&
    typeof (value as { amountCents?: unknown }).amountCents === "number" &&
    typeof (value as { paymentType?: unknown }).paymentType === "string"
  );
}
