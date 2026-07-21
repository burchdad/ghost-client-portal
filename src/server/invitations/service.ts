import type { OrganizationRole, PrismaClient } from "@prisma/client";
import { createOpaqueToken, hashPassword, sha256 } from "@/lib/crypto";
import { createSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { isProductionLike } from "@/server/env";
import { assertNoExternalPlaceholderData } from "@/server/placeholders";

export function generateInvitationToken() {
  return createOpaqueToken(32);
}

export function hashInvitationToken(token: string) {
  return sha256(token);
}

export async function createInvitation(input: {
  organizationId: string;
  contactId?: string | null;
  email: string;
  name: string;
  intendedRole: OrganizationRole;
  createdById: string;
  expiresAt?: Date;
  status?: string;
  reviewedAt?: Date | null;
  isTestRecord?: boolean;
  testRunId?: string | null;
  db?: PrismaClient;
}) {
  const db = input.db ?? getDb();
  const token = generateInvitationToken();
  const email = input.email.trim().toLowerCase();

  if (isProductionLike()) {
    assertNoExternalPlaceholderData("Invitation creation", {
      recipientName: input.name,
      recipientEmail: email,
    });
  }

  await db.invitation.updateMany({
    where: {
      organizationId: input.organizationId,
      email,
      intendedRole: input.intendedRole,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const invitation = await db.invitation.create({
    data: {
      organizationId: input.organizationId,
      contactId: input.contactId,
      email,
      name: input.name.trim(),
      intendedRole: input.intendedRole,
      isTestRecord: input.isTestRecord ?? false,
      testRunId: input.testRunId ?? null,
      tokenHash: hashInvitationToken(token),
      tokenHint: token.slice(-8),
      expiresAt:
        input.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      status: input.status ?? "CREATED",
      reviewedAt: input.reviewedAt ?? null,
      createdById: input.createdById,
    },
  });

  await db.auditLog.create({
    data: {
      actorUserId: input.createdById,
      eventType: "invitation.created",
      entityType: "Invitation",
      entityId: invitation.id,
      metadata: {
        organizationId: input.organizationId,
        email,
        intendedRole: input.intendedRole,
        status: input.status ?? "CREATED",
      },
    },
  });

  return { invitation, token };
}

export async function getInvitationByToken(
  token: string,
  db: PrismaClient = getDb(),
) {
  return db.invitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    include: { organization: true },
  });
}

export async function acceptInvitation(input: {
  token: string;
  email: string;
  name: string;
  password: string;
  acceptedTerms: boolean;
  db?: PrismaClient;
}) {
  if (!input.acceptedTerms) {
    throw new Error("Portal terms must be accepted.");
  }

  const db = input.db ?? getDb();
  const invitation = await getInvitationByToken(input.token, db);
  if (
    !invitation ||
    invitation.revokedAt ||
    invitation.acceptedAt ||
    invitation.expiresAt <= new Date()
  ) {
    throw new Error("This invitation is no longer available.");
  }

  const email = input.email.trim().toLowerCase();
  if (email !== invitation.email) {
    throw new Error("This invitation is no longer available.");
  }

  let userId = "";
  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        name: input.name.trim(),
        passwordHash: await hashPassword(input.password),
        accountStatus: "ACTIVE",
      },
      create: {
        email,
        name: input.name.trim(),
        passwordHash: await hashPassword(input.password),
        accountStatus: "ACTIVE",
      },
    });
    userId = user.id;

    await tx.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: invitation.organizationId,
        },
      },
      update: { role: invitation.intendedRole, deletedAt: null },
      create: {
        userId: user.id,
        organizationId: invitation.organizationId,
        role: invitation.intendedRole,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
        termsAcceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    await tx.activityEvent.create({
      data: {
        organizationId: invitation.organizationId,
        type: "invitation.accepted",
        title: "Client workspace activated",
        body: input.name.trim(),
      },
    });

    await tx.notification.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        type: "portal.welcome",
        title: "Welcome to your Ghost client workspace",
        body: "Your client dashboard is ready.",
        linkTarget: "/dashboard",
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "invitation.accepted",
        entityType: "Invitation",
        entityId: invitation.id,
        metadata: {
          organizationId: invitation.organizationId,
          intendedRole: invitation.intendedRole,
        },
      },
    });
  });

  await createSession(userId);
}
