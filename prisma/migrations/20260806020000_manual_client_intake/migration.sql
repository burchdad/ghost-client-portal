CREATE TYPE "ClientType" AS ENUM ('PAID_CLIENT', 'TRADE_BARTER_CLIENT', 'INTERNAL_GHOST', 'TEST_CLIENT', 'PROSPECT');

CREATE TYPE "BillingModel" AS ENUM ('RETAINER', 'PROJECT_BASED', 'SUBSCRIPTION', 'TRADE_BARTER', 'NO_CHARGE', 'CUSTOM');

CREATE TYPE "PortalStatus" AS ENUM ('NOT_INVITED', 'INVITED', 'ACTIVE', 'PAUSED', 'ARCHIVED');

ALTER TABLE "Organization"
ADD COLUMN "clientType" "ClientType" NOT NULL DEFAULT 'PAID_CLIENT',
ADD COLUMN "billingModel" "BillingModel" NOT NULL DEFAULT 'PROJECT_BASED',
ADD COLUMN "portalStatus" "PortalStatus" NOT NULL DEFAULT 'NOT_INVITED',
ADD COLUMN "clientSince" TIMESTAMP(3),
ADD COLUMN "internalNotes" TEXT,
ADD COLUMN "tradeTerms" TEXT;

UPDATE "Organization"
SET
  "clientType" = CASE
    WHEN "isTestRecord" = true THEN 'TEST_CLIENT'::"ClientType"
    ELSE "clientType"
  END,
  "portalStatus" = CASE
    WHEN "accountStatus" = 'ACTIVE' THEN 'ACTIVE'::"PortalStatus"
    WHEN EXISTS (
      SELECT 1
      FROM "Invitation"
      WHERE "Invitation"."organizationId" = "Organization"."id"
        AND "Invitation"."acceptedAt" IS NULL
        AND "Invitation"."revokedAt" IS NULL
        AND "Invitation"."expiresAt" > now()
    ) THEN 'INVITED'::"PortalStatus"
    ELSE "portalStatus"
  END;

CREATE INDEX "Organization_clientType_idx" ON "Organization"("clientType");
CREATE INDEX "Organization_billingModel_idx" ON "Organization"("billingModel");
CREATE INDEX "Organization_portalStatus_idx" ON "Organization"("portalStatus");
