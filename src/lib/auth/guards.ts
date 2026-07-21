import type { InternalRole, OrganizationRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { billingRoles, hasInternalRole, hasOrganizationRole, projectAccessRoles } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
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
    throw new AuthorizationError("Internal portal access is required.");
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

export async function requireOrganizationRole(
  organizationId: string,
  roles: OrganizationRole[],
) {
  const context = await requireOrganizationMembership(organizationId);

  if (!hasOrganizationRole(context.membership.role, roles)) {
    throw new AuthorizationError("The requested organization role is required.");
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
