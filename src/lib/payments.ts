export function calculateRemainingBalance(
  totalCents: number,
  paidCents: number,
) {
  return Math.max(totalCents - paidCents, 0);
}

export function assertTrustedPaymentAmount(
  requestedCents: number,
  trustedScheduleCents: number,
) {
  if (requestedCents !== trustedScheduleCents) {
    throw new Error(
      "Payment amount must match the trusted server-side schedule.",
    );
  }

  return trustedScheduleCents;
}
