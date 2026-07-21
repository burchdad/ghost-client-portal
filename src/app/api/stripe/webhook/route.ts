import { handleStripeWebhook } from "@/server/stripe/webhooks";

export async function POST(request: Request) {
  return handleStripeWebhook(request);
}
