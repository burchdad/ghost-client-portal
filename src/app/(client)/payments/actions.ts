"use server";

import { redirect } from "next/navigation";
import { requireClientWorkspace } from "@/lib/auth/guards";
import { checkRateLimit } from "@/server/security/rate-limit";
import {
  assertSameOriginSubmission,
  getSafeRequestMetadata,
} from "@/server/security/request";
import { createPaymentScheduleCheckoutSession } from "@/server/stripe/checkout";

export async function createScheduleCheckoutAction(formData: FormData) {
  try {
    await assertSameOriginSubmission();
  } catch {
    redirectWith(
      "error",
      "This payment request could not be verified. Refresh and try again.",
    );
  }

  const { user, organization } = await requireClientWorkspace();
  const scheduleItemId = String(formData.get("paymentScheduleItemId") ?? "");
  const requestMetadata = await getSafeRequestMetadata();
  const limit = checkRateLimit(
    `client-checkout:${user.id}:${requestMetadata.ipAddress ?? "unknown"}`,
    {
      limit: 6,
      windowMs: 60_000,
    },
  );

  if (!limit.allowed) {
    redirectWith(
      "error",
      "Too many checkout attempts. Please wait a moment and try again.",
    );
  }

  if (!scheduleItemId) {
    redirectWith("error", "Choose a payment before starting checkout.");
  }

  const result = await createPaymentScheduleCheckoutSession({
    organizationId: organization.id,
    paymentScheduleItemId: scheduleItemId,
    actorUserId: user.id,
  });

  if (result.status === "created" || result.status === "reused") {
    redirect(result.url);
  }

  if (result.status === "already-paid") {
    redirect(result.redirectTo);
  }

  const message =
    result.reason === "stripe-not-configured"
      ? "Secure Stripe checkout is not configured yet."
      : result.reason === "live-test-checkout-confirmation-required"
        ? "This is marked as test data, so live Stripe checkout is blocked in production."
        : result.reason === "proposal-acceptance-required"
          ? "This proposal must be accepted before checkout can be created."
          : `Checkout is unavailable right now. Support code: ${result.correlationId}`;

  redirectWith("error", message);
}

function redirectWith(key: "error" | "notice", value: string): never {
  redirect(`/payments?${new URLSearchParams({ [key]: value }).toString()}`);
}
