export function tenantProjectWhere(userId: string, projectId: string) {
  return {
    id: projectId,
    deletedAt: null,
    portalVisible: true,
    organization: { memberships: { some: { userId, deletedAt: null } } },
  };
}

export function tenantProposalWhere(userId: string, proposalId: string) {
  return {
    id: proposalId,
    deletedAt: null,
    organization: { memberships: { some: { userId, deletedAt: null } } },
  };
}

export function tenantOwnedWhere(userId: string, id: string) {
  return {
    id,
    organization: { memberships: { some: { userId, deletedAt: null } } },
  };
}
