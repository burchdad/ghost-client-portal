"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sha256 } from "@/lib/crypto";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { isProductionLike } from "@/server/env";
import { assertNoExternalPlaceholderData } from "@/server/placeholders";
import {
  generateProposalToken,
  hashProposalToken,
  rotateProposalToken,
  revokeProposalToken,
} from "@/server/proposals/tokens";
import { transitionProposalStatus } from "@/server/proposals/transitions";

const createProposalSchema = z.object({
  organizationId: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().trim().min(3).max(180),
  expiresAt: z.string().optional(),
});

const updateProposalOperationsSchema = z.object({
  proposalId: z.string().min(1),
  primaryContactId: z.string().optional(),
  internalOwnerId: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function createProposalAction(formData: FormData) {
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
    "PROJECT_MANAGER",
  ]);
  const parsed = createProposalSchema.parse({
    organizationId: formData.get("organizationId"),
    templateId: formData.get("templateId"),
    title: formData.get("title"),
    expiresAt: formData.get("expiresAt") || undefined,
  });
  const db = getDb();
  const template = await db.proposalTemplate.findUniqueOrThrow({
    where: { id: parsed.templateId },
  });
  const token = generateProposalToken();
  const proposalNumber = `GCP-${new Date().getFullYear()}-${Math.floor(Date.now() / 1000)}`;
  const deliverables = Array.isArray(template.defaultDeliverables)
    ? template.defaultDeliverables.filter(
        (item): item is string => typeof item === "string",
      )
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
      objectives:
        template.defaultObjectives ??
        "Confirm shared objectives before publishing this proposal.",
      scopeOfWork:
        template.defaultScope ??
        "Structured scope will be finalized before sending.",
      exclusions:
        template.defaultExclusions ??
        "Out-of-scope work requires a separate written change order.",
      timeline:
        template.defaultTimeline ??
        "Timeline will be confirmed before sending.",
      pricingSummary: "Pricing will be confirmed before sending.",
      terms: template.defaultTerms,
      totalCents: paymentSchedule.reduce(
        (total, item) => total + item.amountCents,
        0,
      ),
      status: "DRAFT",
      deliverables: {
        create: deliverables.map((name, index) => ({
          name,
          sortOrder: index + 1,
        })),
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
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
    "PROJECT_MANAGER",
  ]);
  const proposalId = String(formData.get("proposalId"));
  const db = getDb();
  const proposal = await db.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: {
      organization: {
        include: { primaryContact: true, contacts: true, billingContact: true },
      },
      primaryContact: true,
    },
  });

  if (isProductionLike()) {
    const primary =
      proposal.primaryContact ??
      proposal.organization.primaryContact ??
      proposal.organization.contacts.find((contact) => contact.isPrimary) ??
      proposal.organization.contacts[0] ??
      null;

    assertNoExternalPlaceholderData("proposal publishing", {
      organizationName: proposal.organization.name,
      proposalTitle: proposal.title,
      primaryContactName: primary?.name,
      primaryContactEmail: primary?.email,
      primaryContactTitle: primary?.title,
      billingContactName: proposal.organization.billingContact?.name,
      billingContactEmail: proposal.organization.billingContact?.email,
    });
  }

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
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
    "PROJECT_MANAGER",
  ]);
  const proposalId = String(formData.get("proposalId"));
  if (formData.get("confirmRotation") !== "yes") {
    throw new Error("Token rotation requires explicit confirmation.");
  }
  const expiresAtValue = formData.get("tokenExpiresAt");
  const { token } = await rotateProposalToken(
    getDb(),
    proposalId,
    typeof expiresAtValue === "string" && expiresAtValue
      ? new Date(expiresAtValue)
      : undefined,
  );
  await getDb().auditLog.create({
    data: {
      actorUserId: user.id,
      eventType: "proposal.token_rotated",
      entityType: "Proposal",
      entityId: proposalId,
      metadata: { tokenFingerprint: sha256(token).slice(0, 12) },
    },
  });
  await getDb().outboxEvent.create({
    data: {
      eventType: "proposal.token_rotated",
      aggregateType: "Proposal",
      aggregateId: proposalId,
      payload: { proposalId, tokenFingerprint: sha256(token).slice(0, 12) },
    },
  });

  redirect(`/admin/proposals/${proposalId}?token=${token}`);
}

export async function revokeProposalTokenAction(formData: FormData) {
  const user = await requireInternalRole(["FOUNDER", "ADMINISTRATOR"]);
  const proposalId = String(formData.get("proposalId"));
  await revokeProposalToken(getDb(), proposalId);
  await getDb().auditLog.create({
    data: {
      actorUserId: user.id,
      eventType: "proposal.token_revoked",
      entityType: "Proposal",
      entityId: proposalId,
      metadata: {},
    },
  });
  revalidatePath(`/admin/proposals/${proposalId}`);
}

export async function updateProposalOperationsAction(formData: FormData) {
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
    "PROJECT_MANAGER",
  ]);
  const parsed = updateProposalOperationsSchema.parse({
    proposalId: formData.get("proposalId"),
    primaryContactId: formData.get("primaryContactId") || undefined,
    internalOwnerId: formData.get("internalOwnerId") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  });

  await getDb().$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id: parsed.proposalId },
      data: {
        primaryContactId: parsed.primaryContactId,
        internalOwnerId: parsed.internalOwnerId,
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
        tokenExpiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "proposal.operations_updated",
        entityType: "Proposal",
        entityId: parsed.proposalId,
        metadata: {
          primaryContactUpdated: Boolean(parsed.primaryContactId),
          ownerUpdated: Boolean(parsed.internalOwnerId),
          expirationUpdated: Boolean(parsed.expiresAt),
        },
      },
    });
  });

  revalidatePath(`/admin/proposals/${parsed.proposalId}`);
}

export async function reconcileProposalLifecycleAction(formData: FormData) {
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
  ]);
  const proposalId = String(formData.get("proposalId"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 10) {
    throw new Error("A reconciliation reason is required.");
  }
  const correlationId = crypto.randomUUID();
  const proposal = await getDb().proposal.findUniqueOrThrow({
    where: { id: proposalId },
  });

  await getDb().$transaction(async (tx) => {
    await tx.activityEvent.create({
      data: {
        organizationId: proposal.organizationId,
        type: "proposal.lifecycle_reconciled",
        title: "Proposal lifecycle reconciled",
        body: "Acceptance evidence exists, but the original first-view event was not recorded.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "proposal.lifecycle_reconciled",
        entityType: "Proposal",
        entityId: proposal.id,
        metadata: {
          reason,
          correlationId,
          viewedAtPreservedAsNull: proposal.viewedAt === null,
          acceptedAt: proposal.acceptedAt?.toISOString() ?? null,
          signedAt: proposal.signedAt?.toISOString() ?? null,
        },
      },
    });
    await tx.outboxEvent.create({
      data: {
        eventType: "proposal.lifecycle_reconciled",
        aggregateType: "Proposal",
        aggregateId: proposal.id,
        payload: { proposalId: proposal.id, correlationId },
      },
    });
  });

  revalidatePath(`/admin/proposals/${proposal.id}`);
}

function isPaymentTemplateItem(value: unknown): value is {
  label: string;
  amountCents: number;
  paymentType: "DEPOSIT" | "REMAINING_BALANCE" | "FULL";
} {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as { label?: unknown }).label === "string" &&
    typeof (value as { amountCents?: unknown }).amountCents === "number" &&
    typeof (value as { paymentType?: unknown }).paymentType === "string"
  );
}
