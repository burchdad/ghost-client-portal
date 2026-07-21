"use server";

import { redirect } from "next/navigation";
import { assertSameOriginSubmission, getSafeRequestMetadata } from "@/server/security/request";
import { checkRateLimit } from "@/server/security/rate-limit";
import { createProposalPaymentCheckoutSession } from "@/server/stripe/checkout";

export type PaymentActionState = { error: string | null };

export async function createCheckoutSessionAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    await assertSameOriginSubmission();
  } catch {
    return { error: "This payment request could not be verified. Refresh and try again." };
  }

  const token = String(formData.get("token") ?? "");
  const metadata = await getSafeRequestMetadata();
  const rateLimit = checkRateLimit(`checkout:${metadata.ipAddress ?? "unknown"}:${token.slice(-6)}`, {
    limit: 6,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return { error: "Too many checkout attempts. Please wait a moment and try again." };
  }

  const result = await createProposalPaymentCheckoutSession(token);

  if (result.status === "created" || result.status === "reused") {
    redirect(result.url);
  }

  if (result.status === "already-paid") {
    redirect(result.redirectTo);
  }

  return {
    error:
      result.reason === "stripe-not-configured"
        ? "Secure payment setup is not configured in this environment yet."
        : `Payment is unavailable. Support code: ${result.correlationId}`,
  };
}
