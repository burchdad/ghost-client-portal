-- Phase 3: Stripe checkout, webhook-safe payment state, and activation recovery foundations.

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CHECKOUT_CREATED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'WAIVED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'RECOVERY_REQUIRED';

ALTER TABLE "Organization"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeCustomerCreatedAt" TIMESTAMP(3),
ADD COLUMN "stripeCustomerSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

ALTER TABLE "PaymentScheduleItem"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "projectId" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN "stripeCheckoutId" TEXT,
ADD COLUMN "stripePaymentIntentId" TEXT,
ADD COLUMN "stripeInvoiceId" TEXT,
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "PaymentScheduleItem" psi
SET "organizationId" = p."organizationId"
FROM "Proposal" p
WHERE psi."proposalId" = p."id";

ALTER TABLE "PaymentScheduleItem" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE UNIQUE INDEX "PaymentScheduleItem_stripeCheckoutId_key" ON "PaymentScheduleItem"("stripeCheckoutId");
CREATE INDEX "PaymentScheduleItem_organizationId_status_idx" ON "PaymentScheduleItem"("organizationId", "status");
CREATE INDEX "PaymentScheduleItem_proposalId_paymentType_status_idx" ON "PaymentScheduleItem"("proposalId", "paymentType", "status");

ALTER TABLE "PaymentScheduleItem"
ADD CONSTRAINT "PaymentScheduleItem_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentScheduleItem"
ADD CONSTRAINT "PaymentScheduleItem_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeChargeId" TEXT,
ADD COLUMN "stripeReceiptUrl" TEXT,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "requestId" TEXT,
ADD COLUMN "failureCode" TEXT,
ADD COLUMN "failureMessage" TEXT,
ADD COLUMN "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "recoveryRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recoveryReason" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "failedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

ALTER TABLE "StripeEvent"
ADD COLUMN "apiVersion" TEXT,
ADD COLUMN "livemode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "processingStatus" "PaymentStatus" NOT NULL DEFAULT 'PROCESSING',
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "lastError" TEXT,
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "proposalId" TEXT,
ADD COLUMN "paymentId" TEXT,
ADD COLUMN "paymentScheduleItemId" TEXT,
ADD COLUMN "payloadHash" TEXT;

ALTER TABLE "StripeEvent" ALTER COLUMN "payload" DROP NOT NULL;

UPDATE "StripeEvent"
SET "payloadHash" = 'legacy-' || "stripeEventId"
WHERE "payloadHash" IS NULL;

ALTER TABLE "StripeEvent" ALTER COLUMN "payloadHash" SET NOT NULL;

CREATE INDEX "StripeEvent_processingStatus_receivedAt_idx" ON "StripeEvent"("processingStatus", "receivedAt");
CREATE INDEX "StripeEvent_organizationId_idx" ON "StripeEvent"("organizationId");

CREATE UNIQUE INDEX "Project_proposalId_key" ON "Project"("proposalId");
CREATE UNIQUE INDEX "OnboardingForm_projectId_templateId_key" ON "OnboardingForm"("projectId", "templateId");
