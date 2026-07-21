import type { InternalRole, OrganizationRole } from "@prisma/client";

export const internalRoles: InternalRole[] = [
  "FOUNDER",
  "ADMINISTRATOR",
  "ACCOUNT_MANAGER",
  "PROJECT_MANAGER",
  "BILLING_MANAGER",
  "SUPPORT_AGENT",
];

export const billingRoles: OrganizationRole[] = [
  "OWNER",
  "BILLING_ADMINISTRATOR",
];

export const projectAccessRoles: OrganizationRole[] = [
  "OWNER",
  "BILLING_ADMINISTRATOR",
  "PROJECT_APPROVER",
  "PROJECT_CONTRIBUTOR",
  "VIEWER",
];

export function hasInternalRole(
  role: InternalRole | null | undefined,
  allowed: InternalRole[] = internalRoles,
) {
  return Boolean(role && allowed.includes(role));
}

export function hasOrganizationRole(
  role: OrganizationRole | null | undefined,
  allowed: OrganizationRole[],
) {
  return Boolean(role && allowed.includes(role));
}
