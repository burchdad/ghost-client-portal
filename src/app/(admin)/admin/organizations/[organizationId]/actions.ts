"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { isProductionLike } from "@/server/env";
import { createInvitation } from "@/server/invitations/service";
import { assertNoExternalPlaceholderData } from "@/server/placeholders";
import { redirect } from "next/navigation";

const organizationUpdateSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  primaryContactName: z.string().trim().min(2).max(160),
  primaryContactTitle: z.string().trim().max(120).optional(),
  primaryContactEmail: z.string().email(),
  primaryContactPhone: z.string().trim().max(40).optional(),
  preferredCommunicationMethod: z.string().trim().max(80).optional(),
  isPrimaryApprover: z.boolean(),
  billingContactName: z.string().trim().max(160).optional(),
  billingContactEmail: z.string().email().optional(),
  reason: z.string().trim().min(8).max(500),
});

const invitationCreateSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  email: z.string().email(),
  intendedRole: z.enum([
    "OWNER",
    "BILLING_ADMINISTRATOR",
    "PROJECT_APPROVER",
    "PROJECT_CONTRIBUTOR",
    "VIEWER",
  ]),
  confirmation: z.literal("CREATE REVIEWED INVITATION"),
});

export async function updateOrganizationLifecycleAction(formData: FormData) {
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
  ]);
  const parsed = organizationUpdateSchema.parse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    primaryContactName: formData.get("primaryContactName"),
    primaryContactTitle: formData.get("primaryContactTitle") || undefined,
    primaryContactEmail: formData.get("primaryContactEmail"),
    primaryContactPhone: formData.get("primaryContactPhone") || undefined,
    preferredCommunicationMethod:
      formData.get("preferredCommunicationMethod") || undefined,
    isPrimaryApprover: formData.get("isPrimaryApprover") === "yes",
    billingContactName: formData.get("billingContactName") || undefined,
    billingContactEmail: formData.get("billingContactEmail") || undefined,
    reason: formData.get("reason"),
  });
  const db = getDb();

  if (isProductionLike()) {
    assertNoExternalPlaceholderData("client record cleanup", {
      organizationName: parsed.name,
      primaryContactName: parsed.primaryContactName,
      primaryContactTitle: parsed.primaryContactTitle,
      primaryContactEmail: parsed.primaryContactEmail,
      billingContactName: parsed.billingContactName,
      billingContactEmail: parsed.billingContactEmail,
    });
  }

  await db.$transaction(async (tx) => {
    const organization = await tx.organization.findUniqueOrThrow({
      where: { id: parsed.organizationId },
      include: { contacts: true },
    });
    const primary =
      organization.contacts.find((contact) => contact.isPrimary) ??
      organization.contacts.find(
        (contact) =>
          contact.email.toLowerCase() ===
          parsed.primaryContactEmail.toLowerCase(),
      );
    const primaryContact = primary
      ? await tx.contact.update({
          where: { id: primary.id },
          data: {
            name: parsed.primaryContactName,
            title: parsed.primaryContactTitle,
            email: parsed.primaryContactEmail.toLowerCase(),
            phone: parsed.primaryContactPhone,
            preferredCommunicationMethod: parsed.preferredCommunicationMethod,
            isPrimaryApprover: parsed.isPrimaryApprover,
            isPrimary: true,
          },
        })
      : await tx.contact.create({
          data: {
            organizationId: parsed.organizationId,
            name: parsed.primaryContactName,
            title: parsed.primaryContactTitle,
            email: parsed.primaryContactEmail.toLowerCase(),
            phone: parsed.primaryContactPhone,
            preferredCommunicationMethod: parsed.preferredCommunicationMethod,
            isPrimaryApprover: parsed.isPrimaryApprover,
            isPrimary: true,
          },
        });

    let billingContactId = primaryContact.id;
    if (
      parsed.billingContactEmail &&
      parsed.billingContactEmail.toLowerCase() !==
        parsed.primaryContactEmail.toLowerCase()
    ) {
      const existingBilling = organization.contacts.find(
        (contact) =>
          contact.email.toLowerCase() ===
          parsed.billingContactEmail?.toLowerCase(),
      );
      const billing = existingBilling
        ? await tx.contact.update({
            where: { id: existingBilling.id },
            data: {
              name: parsed.billingContactName || existingBilling.name,
              email: parsed.billingContactEmail.toLowerCase(),
            },
          })
        : await tx.contact.create({
            data: {
              organizationId: parsed.organizationId,
              name: parsed.billingContactName || "Billing Contact",
              email: parsed.billingContactEmail.toLowerCase(),
              isPrimary: false,
            },
          });
      billingContactId = billing.id;
    }

    await tx.organization.update({
      where: { id: parsed.organizationId },
      data: {
        name: parsed.name,
        primaryContactId: primaryContact.id,
        billingContactId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "organization.lifecycle_updated",
        entityType: "Organization",
        entityId: parsed.organizationId,
        metadata: {
          displayNameUpdated: parsed.name !== organization.name,
          previous: {
            name: organization.name,
            primaryContactName: primary?.name ?? null,
            primaryContactEmail: primary?.email ?? null,
            primaryContactTitle: primary?.title ?? null,
            primaryContactPhone: primary?.phone ?? null,
            preferredCommunicationMethod:
              primary?.preferredCommunicationMethod ?? null,
            isPrimaryApprover: primary?.isPrimaryApprover ?? false,
          },
          next: {
            name: parsed.name,
            primaryContactName: parsed.primaryContactName,
            primaryContactEmail: parsed.primaryContactEmail.toLowerCase(),
            primaryContactTitle: parsed.primaryContactTitle ?? null,
            primaryContactPhone: parsed.primaryContactPhone ?? null,
            preferredCommunicationMethod:
              parsed.preferredCommunicationMethod ?? null,
            isPrimaryApprover: parsed.isPrimaryApprover,
            billingContactId,
          },
          reason: parsed.reason,
          correlationId: crypto.randomUUID(),
        },
      },
    });
  });

  revalidatePath(`/admin/organizations/${parsed.organizationId}`);
}

export async function createClientInvitationAction(formData: FormData) {
  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
  ]);
  const parsed = invitationCreateSchema.parse({
    organizationId: formData.get("organizationId"),
    name: formData.get("invitationName"),
    email: formData.get("invitationEmail"),
    intendedRole: formData.get("intendedRole"),
    confirmation: formData.get("confirmation"),
  });
  const latestLaunchReview = await getDb().launchReview.findFirst({
    where: { organizationId: parsed.organizationId },
    orderBy: { createdAt: "desc" },
  });

  if (latestLaunchReview?.finalStatus !== "GO") {
    throw new Error(
      "A GO launch review is required before creating a reviewed invitation.",
    );
  }

  const { token } = await createInvitation({
    organizationId: parsed.organizationId,
    email: parsed.email,
    name: parsed.name,
    intendedRole: parsed.intendedRole,
    createdById: user.id,
    status: "REVIEWED",
    reviewedAt: new Date(),
  });

  redirect(`/admin/organizations/${parsed.organizationId}?invite=${token}`);
}
