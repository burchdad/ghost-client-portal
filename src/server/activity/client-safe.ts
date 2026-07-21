const clientSafeActivityTypes = new Set([
  "proposal.viewed",
  "proposal.accepted",
  "proposal.deposit_paid",
  "payment.completed",
  "payment.checkout_created",
  "project.created",
  "project.activated",
  "onboarding.created",
  "onboarding.submitted",
  "client_action.created",
  "client_action.completed",
  "file.uploaded",
  "milestone.completed",
  "deliverable.published",
  "approval.submitted",
]);

export function isClientSafeActivity(type: string) {
  return clientSafeActivityTypes.has(type);
}
