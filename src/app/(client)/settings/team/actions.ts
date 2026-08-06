"use server";

import type { OrganizationRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { clientTeamInvitationEmail } from "@/server/email/templates";
import { getEmailProvider } from "@/server/email/provider";
import { createInvitation } from "@/server/invitations/service";
import { checkRateLimit } from "@/server/security/rate-limit";
import { assertSameOriginSubmission } from "@/server/security/request";

const inviteRoles = [
  "OWNER",
  "BILLING_ADMINISTRATOR",
  "PROJECT_APPROVER",
  "PROJECT_CONTRIBUTOR",
  "VIEWER",
] as const satisfies readonly OrganizationRole[];

const inviteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  role: z.enum(inviteRoles).default("PROJECT_CONTRIBUTOR"),
});

export async function createTeamInvitationAction(formData: FormData) {
  await assertOwnerSubmission();
  const { user, organization, membership } = await requireClientWorkspace();

  if (membership.role !== "OWNER") {
    redirectWith("error", "Only workspace owners can invite team members.");
  }

  const limit = checkRateLimit(`team-invite:${organization.id}:${user.id}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    redirectWith("error", "Too many invitations. Please wait a minute.");
  }

  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirectWith("error", "Add a valid name, email, and role.");
  }

  const { invitation, token } = await createInvitation({
    organizationId: organization.id,
    email: parsed.data.email,
    name: parsed.data.name,
    intendedRole: parsed.data.role,
    createdById: user.id,
    status: "SENT",
  });
  const invitationUrl = `${getAppUrl()}/invite/${token}`;
  const email = clientTeamInvitationEmail({
    organization: organization.name,
    inviterName: user.name,
    inviteeName: invitation.name,
    role: invitation.intendedRole,
    invitationUrl,
    expiresAt: invitation.expiresAt,
  });
  const result = await getEmailProvider()
    .send({
      to: invitation.email,
      idempotencyKey: `team-invite:${invitation.id}`,
      ...email,
    })
    .catch((error) => {
      console.error("Team invitation email failed", {
        invitationId: invitation.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return { provider: "resend", status: "failed" as const };
    });

  await getDb().invitation.update({
    where: { id: invitation.id },
    data: {
      sentAt: new Date(),
      status:
        result.status === "sent" || result.status === "queued"
          ? "SENT"
          : "CREATED",
    },
  });

  revalidatePath("/settings/team");
  redirect(
    `/settings/team?${new URLSearchParams({
      notice:
        result.status === "sent"
          ? `Invite sent to ${invitation.email}.`
          : `Invite created for ${invitation.email}. Copy the activation link below.`,
      invite: token,
    }).toString()}`,
  );
}

export async function revokeTeamInvitationAction(formData: FormData) {
  await assertOwnerSubmission();
  const { user, organization, membership } = await requireClientWorkspace();

  if (membership.role !== "OWNER") {
    redirectWith("error", "Only workspace owners can revoke invitations.");
  }

  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) {
    redirectWith("error", "Choose an invitation to revoke.");
  }

  await getDb().$transaction(async (tx) => {
    const invitation = await tx.invitation.findFirst({
      where: {
        id: invitationId,
        organizationId: organization.id,
        acceptedAt: null,
        revokedAt: null,
      },
    });

    if (!invitation) {
      return;
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date(), status: "REVOKED" },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "invitation.revoked",
        entityType: "Invitation",
        entityId: invitation.id,
        metadata: {
          organizationId: organization.id,
          email: invitation.email,
          intendedRole: invitation.intendedRole,
        },
      },
    });
  });

  revalidatePath("/settings/team");
  redirectWith("notice", "Invitation revoked.");
}

async function assertOwnerSubmission() {
  try {
    await assertSameOriginSubmission();
  } catch {
    redirectWith(
      "error",
      "This team request could not be verified. Refresh and try again.",
    );
  }
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function redirectWith(key: "error" | "notice", value: string): never {
  redirect(
    `/settings/team?${new URLSearchParams({ [key]: value }).toString()}`,
  );
}
