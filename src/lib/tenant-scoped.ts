import type { PrismaClient } from "@prisma/client";

export async function getProjectForMember(
  db: PrismaClient,
  userId: string,
  projectId: string,
) {
  return db.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      portalVisible: true,
      organization: {
        memberships: {
          some: { userId, deletedAt: null },
        },
      },
    },
  });
}

export async function getProposalForMember(
  db: PrismaClient,
  userId: string,
  proposalId: string,
) {
  return db.proposal.findFirst({
    where: {
      id: proposalId,
      deletedAt: null,
      organization: {
        memberships: {
          some: { userId, deletedAt: null },
        },
      },
    },
  });
}
