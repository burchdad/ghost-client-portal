import type { InternalRole, OrganizationRole } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  billingRoles,
  hasInternalRole,
  hasOrganizationRole,
  projectAccessRoles,
} from "@/lib/auth/permissions";
import {
  getActiveOrganizationId,
  getCurrentUser,
  setActiveOrganization,
} from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export class AuthorizationError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireInternalRole(roles?: InternalRole[]) {
  const user = await requireAuthenticatedUser();

  if (!hasInternalRole(user.internalRole, roles)) {
    redirect(user.internalRole ? "/admin" : "/dashboard");
  }

  return user;
}

export async function requireOrganizationMembership(organizationId?: string) {
  const user = await requireAuthenticatedUser();
  const membership = await getDb().organizationMembership.findFirst({
    where: {
      userId: user.id,
      deletedAt: null,
      organizationId,
      organization: { deletedAt: null },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    throw new AuthorizationError("Organization membership is required.");
  }

  return { user, membership, organization: membership.organization };
}

export async function requireClientWorkspace(organizationId?: string) {
  const user = await requireAuthenticatedUser();
  const db = getDb();

  if (!organizationId && user.internalRole) {
    const organization = await db.organization.upsert({
      where: { slug: "ghost-ai-solutions" },
      update: { accountStatus: "ACTIVE" },
      create: {
        name: "Ghost AI Solutions",
        slug: "ghost-ai-solutions",
        accountStatus: "ACTIVE",
      },
    });
    const ghostMembership = await db.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
      update: { deletedAt: null, role: "OWNER" },
      create: {
        userId: user.id,
        organizationId: organization.id,
        role: "OWNER",
      },
      include: { organization: true },
    });

    return {
      user,
      membership: ghostMembership,
      organization: ghostMembership.organization,
    };
  }

  const activeOrganizationId =
    organizationId ?? (await getActiveOrganizationId());
  const membership = await db.organizationMembership.findFirst({
    where: {
      userId: user.id,
      deletedAt: null,
      organizationId: activeOrganizationId ?? undefined,
      organization: { deletedAt: null },
    },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  if (membership) {
    if (!organizationId && membership.organizationId !== activeOrganizationId) {
      await setActiveOrganization(membership.organizationId);
    }
    return { user, membership, organization: membership.organization };
  }

  if (activeOrganizationId && !organizationId) {
    const fallbackMembership = await db.organizationMembership.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
        organization: { deletedAt: null },
      },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    });

    if (fallbackMembership) {
      await setActiveOrganization(fallbackMembership.organizationId);
      return {
        user,
        membership: fallbackMembership,
        organization: fallbackMembership.organization,
      };
    }
  }

  throw new AuthorizationError("Organization membership is required.");
}

export async function requireOrganizationRole(
  organizationId: string,
  roles: OrganizationRole[],
) {
  const context = await requireOrganizationMembership(organizationId);

  if (!hasOrganizationRole(context.membership.role, roles)) {
    throw new AuthorizationError(
      "The requested organization role is required.",
    );
  }

  return context;
}

export async function requireProjectAccess(projectId: string) {
  const user = await requireAuthenticatedUser();
  const project = await getDb().project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      portalVisible: true,
      organization: {
        memberships: {
          some: {
            userId: user.id,
            deletedAt: null,
            role: { in: projectAccessRoles },
          },
        },
      },
    },
    include: { organization: true },
  });

  if (!project) {
    throw new AuthorizationError("Project access is required.");
  }

  return { user, project, organization: project.organization };
}

export async function requireProposalAccess(proposalId: string) {
  const user = await requireAuthenticatedUser();
  const proposal = await getDb().proposal.findFirst({
    where: {
      id: proposalId,
      deletedAt: null,
      organization: {
        memberships: {
          some: {
            userId: user.id,
            deletedAt: null,
          },
        },
      },
    },
    include: { organization: true },
  });

  if (!proposal) {
    throw new AuthorizationError("Proposal access is required.");
  }

  return { user, proposal, organization: proposal.organization };
}

export async function requireBillingAccess(organizationId: string) {
  return requireOrganizationRole(organizationId, billingRoles);
}
