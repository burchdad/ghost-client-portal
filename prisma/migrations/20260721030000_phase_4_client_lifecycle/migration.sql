-- Phase 4: client lifecycle foundation, staging safety, and auditable operations.

CREATE TYPE "ClientActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'NEEDS_CHANGES', 'COMPLETED', 'WAIVED', 'EXPIRED');
CREATE TYPE "ClientActionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ClientActionCategory" AS ENUM ('ONBOARDING', 'FILE_UPLOAD', 'APPROVAL', 'PAYMENT', 'DECISION', 'REVIEW', 'GENERAL');

ALTER TABLE "Organization"
ADD COLUMN "primaryContactId" TEXT,
ADD COLUMN "billingContactId" TEXT;

ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_primaryContactId_fkey"
FOREIGN KEY ("primaryContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_billingContactId_fkey"
FOREIGN KEY ("billingContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectPhase"
ADD COLUMN "clientVisibleDescription" TEXT,
ADD COLUMN "clientVisibleNotes" TEXT,
ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "targetDate" TIMESTAMP(3),
ADD COLUMN "completedDate" TIMESTAMP(3),
ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "ProjectPhase_projectId_name_key" ON "ProjectPhase"("projectId", "name");
CREATE INDEX "ProjectPhase_projectId_sortOrder_idx" ON "ProjectPhase"("projectId", "sortOrder");

ALTER TABLE "Milestone" ADD COLUMN "dueAt" TIMESTAMP(3);
CREATE INDEX "Milestone_projectId_status_idx" ON "Milestone"("projectId", "status");

ALTER TABLE "FileAsset" ADD COLUMN "onboardingFormId" TEXT;
ALTER TABLE "FileAsset"
ADD CONSTRAINT "FileAsset_onboardingFormId_fkey"
FOREIGN KEY ("onboardingFormId") REFERENCES "OnboardingForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "FileAsset_projectId_idx" ON "FileAsset"("projectId");
CREATE INDEX "FileAsset_onboardingFormId_idx" ON "FileAsset"("onboardingFormId");
CREATE INDEX "ActivityEvent_projectId_createdAt_idx" ON "ActivityEvent"("projectId", "createdAt");

CREATE TABLE "ClientAction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "assignedUserId" TEXT,
  "relatedOnboardingFormId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "ClientActionCategory" NOT NULL,
  "priority" "ClientActionPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "ClientActionStatus" NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "clientVisibleInstructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientAction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClientAction"
ADD CONSTRAINT "ClientAction_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientAction"
ADD CONSTRAINT "ClientAction_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientAction"
ADD CONSTRAINT "ClientAction_assignedUserId_fkey"
FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientAction"
ADD CONSTRAINT "ClientAction_relatedOnboardingFormId_fkey"
FOREIGN KEY ("relatedOnboardingFormId") REFERENCES "OnboardingForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ClientAction_organizationId_status_dueAt_idx" ON "ClientAction"("organizationId", "status", "dueAt");
CREATE INDEX "ClientAction_projectId_status_idx" ON "ClientAction"("projectId", "status");
CREATE INDEX "ClientAction_assignedUserId_status_idx" ON "ClientAction"("assignedUserId", "status");

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "contactId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "intendedRole" "OrganizationRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenHint" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "termsAcceptedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "acceptedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_acceptedById_fkey"
FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE UNIQUE INDEX "Invitation_organizationId_email_intendedRole_acceptedAt_key" ON "Invitation"("organizationId", "email", "intendedRole", "acceptedAt");
CREATE UNIQUE INDEX "Invitation_one_active_per_email_role_key" ON "Invitation"("organizationId", "email", "intendedRole") WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL;
CREATE INDEX "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

CREATE TABLE "ProjectProgressOverride" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "previousProgress" INTEGER NOT NULL,
  "newProgress" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "actorUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectProgressOverride_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProjectProgressOverride"
ADD CONSTRAINT "ProjectProgressOverride_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectProgressOverride"
ADD CONSTRAINT "ProjectProgressOverride_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectProgressOverride"
ADD CONSTRAINT "ProjectProgressOverride_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProjectProgressOverride_organizationId_createdAt_idx" ON "ProjectProgressOverride"("organizationId", "createdAt");
CREATE INDEX "ProjectProgressOverride_projectId_createdAt_idx" ON "ProjectProgressOverride"("projectId", "createdAt");
