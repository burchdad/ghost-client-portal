import type { CheckoutMetadata } from "./types";

export function createCheckoutMetadata(input: CheckoutMetadata) {
  return {
    organizationId: input.organizationId,
    proposalId: input.proposalId,
    proposalNumber: input.proposalNumber,
    proposalAcceptanceId: input.proposalAcceptanceId,
    paymentScheduleItemId: input.paymentScheduleItemId,
    internalPaymentId: input.internalPaymentId,
    paymentType: input.paymentType,
    projectId: input.projectId ?? "",
    environment: input.environment,
    requestId: input.requestId,
  };
}

export function parseCheckoutMetadata(
  metadata: Record<string, string> | null | undefined,
) {
  if (!metadata) {
    throw new Error("Stripe metadata is missing.");
  }

  const required = [
    "organizationId",
    "proposalId",
    "proposalAcceptanceId",
    "paymentScheduleItemId",
    "internalPaymentId",
    "paymentType",
  ] as const;

  for (const key of required) {
    if (!metadata[key]) {
      throw new Error(`Stripe metadata ${key} is missing.`);
    }
  }

  return metadata as Record<(typeof required)[number], string> &
    Record<string, string>;
}
