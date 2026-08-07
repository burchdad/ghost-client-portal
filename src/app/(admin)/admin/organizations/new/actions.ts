"use server";

import type { BillingModel, ClientType } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireInternalRole } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getEmailProvider } from "@/server/email/provider";
import { clientTeamInvitationEmail } from "@/server/email/templates";
import { isProductionLike } from "@/server/env";
import { createInvitation } from "@/server/invitations/service";
import { assertNoExternalPlaceholderData } from "@/server/placeholders";
import { assertSameOriginSubmission } from "@/server/security/request";

const clientTypes = [
  "PAID_CLIENT",
  "TRADE_BARTER_CLIENT",
  "INTERNAL_GHOST",
  "TEST_CLIENT",
  "PROSPECT",
] as const satisfies readonly ClientType[];

const billingModels = [
  "RETAINER",
  "PROJECT_BASED",
  "SUBSCRIPTION",
  "TRADE_BARTER",
  "NO_CHARGE",
  "CUSTOM",
] as const satisfies readonly BillingModel[];

const manualClientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  clientType: z.enum(clientTypes),
  billingModel: z.enum(billingModels),
  clientSince: z.string().trim().optional(),
  primaryContactName: z.string().trim().min(2).max(160),
  primaryContactTitle: z.string().trim().max(120).optional(),
  primaryContactEmail: z.string().trim().email().max(180),
  primaryContactPhone: z.string().trim().max(40).optional(),
  billingContactName: z.string().trim().max(160).optional(),
  billingContactEmail: z.string().trim().email().max(180).optional(),
  tradeTerms: z.string().trim().max(2000).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
  sendInvite: z.boolean(),
  reason: z.string().trim().min(8).max(500),
});

export async function createManualClientAction(formData: FormData) {
  try {
    await assertSameOriginSubmission();
  } catch {
    redirectWithError("This request could not be verified. Refresh and retry.");
  }

  const user = await requireInternalRole([
    "FOUNDER",
    "ADMINISTRATOR",
    "ACCOUNT_MANAGER",
  ]);
  const parsed = manualClientSchema.safeParse({
    name: formData.get("name"),
    clientType: formData.get("clientType"),
    billingModel: formData.get("billingModel"),
    clientSince: formData.get("clientSince") || undefined,
    primaryContactName: formData.get("primaryContactName"),
    primaryContactTitle: formData.get("primaryContactTitle") || undefined,
    primaryContactEmail: formData.get("primaryContactEmail"),
    primaryContactPhone: formData.get("primaryContactPhone") || undefined,
    billingContactName: formData.get("billingContactName") || undefined,
    billingContactEmail: formData.get("billingContactEmail") || undefined,
    tradeTerms: formData.get("tradeTerms") || undefined,
    internalNotes: formData.get("internalNotes") || undefined,
    sendInvite: formData.get("sendInvite") === "yes",
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    redirectWithError("Add the required client, contact, and audit details.");
  }

  const input = parsed.data;
  const primaryEmail = input.primaryContactEmail.toLowerCase();
  const billingEmail = input.billingContactEmail?.toLowerCase();

  if (isProductionLike()) {
    assertNoExternalPlaceholderData("Manual client creation", {
      organizationName: input.name,
      primaryContactName: input.primaryContactName,
      primaryContactTitle: input.primaryContactTitle,
      primaryContactEmail: primaryEmail,
      billingContactName: input.billingContactName,
      billingContactEmail: billingEmail,
    });
  }

  const db = getDb();
  const slug = await uniqueOrganizationSlug(input.name);
  const clientSince = input.clientSince
    ? new Date(`${input.clientSince}T00:00:00.000Z`)
    : null;

  const result = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug,
        clientType: input.clientType,
        billingModel: input.billingModel,
        portalStatus: input.sendInvite ? "INVITED" : "NOT_INVITED",
        clientSince,
        tradeTerms: input.tradeTerms,
        internalNotes: input.internalNotes,
      },
    });

    const primaryContact = await tx.contact.create({
      data: {
        organizationId: organization.id,
        name: input.primaryContactName,
        title: input.primaryContactTitle,
        email: primaryEmail,
        phone: input.primaryContactPhone,
        isPrimary: true,
        isPrimaryApprover: true,
      },
    });

    let billingContactId = primaryContact.id;
    if (billingEmail && billingEmail !== primaryEmail) {
      const billingContact = await tx.contact.create({
        data: {
          organizationId: organization.id,
          name: input.billingContactName || "Billing Contact",
          email: billingEmail,
          isPrimary: false,
        },
      });
      billingContactId = billingContact.id;
    }

    await tx.organization.update({
      where: { id: organization.id },
      data: {
        primaryContactId: primaryContact.id,
        billingContactId,
      },
    });

    await tx.activityEvent.create({
      data: {
        organizationId: organization.id,
        type: "organization.manual_created",
        title: "Client manually added",
        body: `${input.clientType} / ${input.billingModel}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "organization.manual_created",
        entityType: "Organization",
        entityId: organization.id,
        metadata: {
          clientType: input.clientType,
          billingModel: input.billingModel,
          portalStatus: input.sendInvite ? "INVITED" : "NOT_INVITED",
          reason: input.reason,
        },
      },
    });

    return { organization, primaryContact };
  });

  if (!input.sendInvite) {
    redirect(`/admin/organizations/${result.organization.id}?created=manual`);
  }

  const { invitation, token } = await createInvitation({
    organizationId: result.organization.id,
    contactId: result.primaryContact.id,
    email: primaryEmail,
    name: input.primaryContactName,
    intendedRole: "OWNER",
    createdById: user.id,
    status: "SENT",
    reviewedAt: new Date(),
  });

  const invitationUrl = `${getAppUrl()}/invite/${token}`;
  const email = clientTeamInvitationEmail({
    organization: result.organization.name,
    inviterName: user.name,
    inviteeName: invitation.name,
    role: invitation.intendedRole,
    invitationUrl,
    expiresAt: invitation.expiresAt,
  });
  const emailResult = await getEmailProvider()
    .send({
      to: invitation.email,
      idempotencyKey: `manual-client-invite:${invitation.id}`,
      ...email,
    })
    .catch((error) => {
      console.error("Manual client invitation email failed", {
        invitationId: invitation.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return { provider: "resend", status: "failed" as const };
    });

  await db.$transaction([
    db.invitation.update({
      where: { id: invitation.id },
      data: {
        sentAt: new Date(),
        status:
          emailResult.status === "sent" || emailResult.status === "queued"
            ? "SENT"
            : "CREATED",
      },
    }),
    db.organization.update({
      where: { id: result.organization.id },
      data: { portalStatus: "INVITED" },
    }),
  ]);

  redirect(
    `/admin/organizations/${result.organization.id}?${new URLSearchParams({
      created: "manual",
      invite: token,
      notice:
        emailResult.status === "sent"
          ? `Client created and invite sent to ${invitation.email}.`
          : `Client created. Email delivery did not confirm, so copy the activation link.`,
    }).toString()}`,
  );
}

async function uniqueOrganizationSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "client";
  const db = getDb();

  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const existing = await db.organization.findUnique({ where: { slug } });
    if (!existing) {
      return slug;
    }
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function redirectWithError(error: string): never {
  redirect(
    `/admin/organizations/new?${new URLSearchParams({ error }).toString()}`,
  );
}
