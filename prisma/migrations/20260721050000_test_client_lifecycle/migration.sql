-- Phase 4.7: isolated client lifecycle test-run support.
-- Additive only. No real client records are modified by this migration.

CREATE TABLE IF NOT EXISTS "TestRun" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "clientEmail" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "clientTitle" TEXT NOT NULL,
  "organizationName" TEXT NOT NULL,
  "proposalId" TEXT,
  "projectId" TEXT,
  "proposalTokenHash" TEXT,
  "proposalTokenHint" TEXT,
  "invitationId" TEXT,
  "invitationTokenHash" TEXT,
  "invitationTokenHint" TEXT,
  "proposalEmailSentAt" TIMESTAMP(3),
  "proposalEmailMessageId" TEXT,
  "invitationEmailSentAt" TIMESTAMP(3),
  "invitationEmailMessageId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "cleanupAt" TIMESTAMP(3),
  "createdById" TEXT,
  CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "isTestRecord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "testRunId" TEXT;

ALTER TABLE "Contact"
ADD COLUMN IF NOT EXISTS "isTestRecord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "testRunId" TEXT;

ALTER TABLE "Proposal"
ADD COLUMN IF NOT EXISTS "isTestRecord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "testRunId" TEXT;

ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "isTestRecord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "testRunId" TEXT;

ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "isTestRecord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "testRunId" TEXT;

ALTER TABLE "Invitation"
ADD COLUMN IF NOT EXISTS "isTestRecord" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "testRunId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestRun_createdById_fkey') THEN
    ALTER TABLE "TestRun"
    ADD CONSTRAINT "TestRun_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Organization_testRunId_fkey') THEN
    ALTER TABLE "Organization"
    ADD CONSTRAINT "Organization_testRunId_fkey"
    FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contact_testRunId_fkey') THEN
    ALTER TABLE "Contact"
    ADD CONSTRAINT "Contact_testRunId_fkey"
    FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Proposal_testRunId_fkey') THEN
    ALTER TABLE "Proposal"
    ADD CONSTRAINT "Proposal_testRunId_fkey"
    FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_testRunId_fkey') THEN
    ALTER TABLE "Project"
    ADD CONSTRAINT "Project_testRunId_fkey"
    FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_testRunId_fkey') THEN
    ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_testRunId_fkey"
    FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invitation_testRunId_fkey') THEN
    ALTER TABLE "Invitation"
    ADD CONSTRAINT "Invitation_testRunId_fkey"
    FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TestRun_clientEmail_status_idx" ON "TestRun"("clientEmail", "status");
CREATE INDEX IF NOT EXISTS "Organization_testRunId_idx" ON "Organization"("testRunId");
CREATE INDEX IF NOT EXISTS "Contact_testRunId_idx" ON "Contact"("testRunId");
CREATE INDEX IF NOT EXISTS "Proposal_testRunId_idx" ON "Proposal"("testRunId");
CREATE INDEX IF NOT EXISTS "Project_testRunId_idx" ON "Project"("testRunId");
CREATE INDEX IF NOT EXISTS "Payment_testRunId_idx" ON "Payment"("testRunId");
CREATE INDEX IF NOT EXISTS "Invitation_testRunId_idx" ON "Invitation"("testRunId");
