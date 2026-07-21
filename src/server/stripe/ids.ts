export function redactStripeId(value: string | null | undefined) {
  if (!value) {
    return "none";
  }

  return value.length <= 10 ? `${value.slice(0, 4)}...` : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function stripeIdempotencyKey(parts: string[]) {
  return parts.join(":").replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 255);
}
