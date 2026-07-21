import Stripe from "stripe";
import { getStripeServerConfig } from "./config";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const config = getStripeServerConfig();

  if (!config.configured) {
    throw new Error(config.reason);
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion as Stripe.LatestApiVersion | undefined,
      typescript: true,
    });
  }

  return stripeClient;
}
