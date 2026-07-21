-- Phase 2: public proposal links, proposal tracking, and immutable acceptance snapshots.

ALTER TABLE "ProposalTemplate"
ADD COLUMN "titlePattern" TEXT,
ADD COLUMN "defaultSummary" TEXT,
ADD COLUMN "defaultObjectives" TEXT,
ADD COLUMN "defaultScope" TEXT,
ADD COLUMN "defaultExclusions" TEXT,
ADD COLUMN "defaultTimeline" TEXT,
ADD COLUMN "defaultDeliverables" JSONB,
ADD COLUMN "defaultPaymentSchedule" JSONB;

ALTER TABLE "Proposal"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sentAt" TIMESTAMP(3),
ADD COLUMN "lastViewedAt" TIMESTAMP(3),
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "versionLabel" TEXT NOT NULL DEFAULT 'v1';

ALTER TABLE "ProposalAcceptance"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "signerEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reviewedScope" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "acceptedPaymentSchedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "note" TEXT,
ADD COLUMN "purchaseOrderNumber" TEXT,
ADD COLUMN "proposalVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "proposalVersionLabel" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN "proposalSnapshot" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "proposalContentHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN "acceptancePayloadHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN "requestId" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN "idempotencyKey" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "ProposalAcceptance" pa
SET "organizationId" = p."organizationId"
FROM "Proposal" p
WHERE pa."proposalId" = p."id";

ALTER TABLE "ProposalAcceptance"
ALTER COLUMN "organizationId" SET NOT NULL,
ALTER COLUMN "signerEmail" DROP DEFAULT,
ALTER COLUMN "requestId" DROP DEFAULT,
ALTER COLUMN "idempotencyKey" DROP DEFAULT;

CREATE INDEX "ProposalAcceptance_organizationId_idx" ON "ProposalAcceptance"("organizationId");
CREATE UNIQUE INDEX "ProposalAcceptance_proposalId_proposalVersion_key" ON "ProposalAcceptance"("proposalId", "proposalVersion");
CREATE UNIQUE INDEX "ProposalAcceptance_proposalId_idempotencyKey_key" ON "ProposalAcceptance"("proposalId", "idempotencyKey");

ALTER TABLE "ProposalAcceptance"
ADD CONSTRAINT "ProposalAcceptance_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
