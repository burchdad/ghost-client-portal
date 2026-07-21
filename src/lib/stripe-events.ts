export function isRetryableStripeEvent(
  existing: { processedAt: Date | null } | null,
) {
  return !existing?.processedAt;
}
