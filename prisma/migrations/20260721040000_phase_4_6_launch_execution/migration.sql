-- Phase 4.6: guarded Gray Matters production launch execution support.
-- Additive only: no existing data is deleted or rewritten by this migration.

ALTER TABLE "Contact"
ADD COLUMN IF NOT EXISTS "preferredCommunicationMethod" TEXT,
ADD COLUMN IF NOT EXISTS "isPrimaryApprover" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProposalAcceptance"
ADD COLUMN IF NOT EXISTS "invalidatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "invalidatedById" TEXT,
ADD COLUMN IF NOT EXISTS "invalidationReason" TEXT,
ADD COLUMN IF NOT EXISTS "invalidationType" TEXT;

ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "checkoutDisposition" TEXT,
ADD COLUMN IF NOT EXISTS "checkoutDispositionAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "checkoutDispositionById" TEXT,
ADD COLUMN IF NOT EXISTS "checkoutDispositionReason" TEXT;

ALTER TABLE "Invitation"
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'CREATED';

CREATE TABLE IF NOT EXISTS "MigrationConfirmation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "migrationName" TEXT NOT NULL,
  "backupReference" TEXT NOT NULL,
  "backupTimestamp" TIMESTAMP(3) NOT NULL,
  "operatorUserId" TEXT,
  "operatorLabel" TEXT NOT NULL,
  "confirmationPhraseHash" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "result" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MigrationConfirmation_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MigrationConfirmation_organizationId_fkey'
  ) THEN
    ALTER TABLE "MigrationConfirmation"
    ADD CONSTRAINT "MigrationConfirmation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MigrationConfirmation_operatorUserId_fkey'
  ) THEN
    ALTER TABLE "MigrationConfirmation"
    ADD CONSTRAINT "MigrationConfirmation_operatorUserId_fkey"
    FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MigrationConfirmation_migrationName_environment_idx"
ON "MigrationConfirmation"("migrationName", "environment");

CREATE INDEX IF NOT EXISTS "MigrationConfirmation_organizationId_idx"
ON "MigrationConfirmation"("organizationId");

CREATE TABLE IF NOT EXISTS "LaunchReview" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "proposalId" TEXT,
  "finalStatus" TEXT NOT NULL,
  "checklist" JSONB NOT NULL,
  "report" JSONB NOT NULL,
  "operatorUserId" TEXT,
  "operatorLabel" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LaunchReview_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LaunchReview_organizationId_fkey'
  ) THEN
    ALTER TABLE "LaunchReview"
    ADD CONSTRAINT "LaunchReview_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LaunchReview_proposalId_fkey'
  ) THEN
    ALTER TABLE "LaunchReview"
    ADD CONSTRAINT "LaunchReview_proposalId_fkey"
    FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LaunchReview_operatorUserId_fkey'
  ) THEN
    ALTER TABLE "LaunchReview"
    ADD CONSTRAINT "LaunchReview_operatorUserId_fkey"
    FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "LaunchReview_organizationId_createdAt_idx"
ON "LaunchReview"("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "LaunchReview_proposalId_idx"
ON "LaunchReview"("proposalId");
