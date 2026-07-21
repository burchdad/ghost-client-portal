import {
  validateStripeEnvironment,
  type AppEnvironment,
  type StripeMode,
} from "@/server/env";

export type StripeServerConfig =
  | {
      configured: true;
      secretKey: string;
      webhookSecret: string | null;
      publishableKey: string | null;
      appUrl: string;
      apiVersion?: string;
      environment: AppEnvironment;
      stripeMode: StripeMode;
    }
  | { configured: false; reason: string; appUrl: string };

export function getStripeServerConfig(): StripeServerConfig {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return {
      configured: false,
      reason: "Stripe secret key is not configured.",
      appUrl,
    };
  }

  const validation = validateStripeEnvironment({
    secretKey,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  return {
    configured: true,
    secretKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? null,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
    appUrl,
    apiVersion: process.env.STRIPE_API_VERSION,
    environment: validation.environment,
    stripeMode: validation.stripeMode,
  };
}
