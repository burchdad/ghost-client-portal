import { headers } from "next/headers";

export async function getSafeRequestMetadata() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();

  return {
    requestId: headerStore.get("x-request-id") ?? crypto.randomUUID(),
    ipAddress: forwardedFor || headerStore.get("x-real-ip"),
    userAgent: truncate(headerStore.get("user-agent"), 500),
    origin: headerStore.get("origin"),
    host: headerStore.get("host"),
  };
}

export async function assertSameOriginSubmission() {
  const { origin, host } = await getSafeRequestMetadata();

  if (!origin || !host) {
    return;
  }

  const originHost = new URL(origin).host;

  if (originHost !== host) {
    throw new Error("Submission origin could not be verified.");
  }
}

function truncate(value: string | null, maxLength: number) {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
