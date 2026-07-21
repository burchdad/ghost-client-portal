import type { PrismaClient } from "@prisma/client";
import { getDb } from "@/lib/db";
import { stripeIdempotencyKey } from "./ids";
import { getStripeClient } from "./client";

export async function getOrCreateStripeCustomer(
  organizationId: string,
  db: PrismaClient = getDb(),
) {
  const stripe = getStripeClient();
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: { contacts: { where: { isPrimary: true }, take: 1 } },
  });

  if (!organization) {
    throw new Error("Organization not found.");
  }

  if (organization.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(organization.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) {
        await db.organization.update({
          where: { id: organization.id },
          data: { stripeCustomerSyncedAt: new Date() },
        });
        return existing.id;
      }
    } catch {
      // If Stripe lookup fails, create a replacement customer with the same deterministic idempotency key.
    }
  }

  const primaryContact = organization.contacts[0];
  const customer = await stripe.customers.create(
    {
      name: organization.name,
      email: primaryContact?.email,
      metadata: { organizationId: organization.id },
    },
    { idempotencyKey: stripeIdempotencyKey(["customer", "create", organization.id]) },
  );

  await db.organization.update({
    where: { id: organization.id },
    data: {
      stripeCustomerId: customer.id,
      stripeCustomerCreatedAt: new Date(),
      stripeCustomerSyncedAt: new Date(),
    },
  });

  return customer.id;
}
