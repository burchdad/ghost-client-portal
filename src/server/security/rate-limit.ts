const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, options = { limit: 30, windowMs: 60_000 }) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true };
  }

  if (existing.count >= options.limit) {
    return { allowed: false };
  }

  existing.count += 1;
  return { allowed: true };
}
