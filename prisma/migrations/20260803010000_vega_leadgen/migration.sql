CREATE TABLE "VegaLeadQuery" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "requestedById" TEXT,
  "prompt" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "source" TEXT NOT NULL DEFAULT 'client_portal',
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VegaLeadQuery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VegaLead" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "queryId" TEXT,
  "company" TEXT NOT NULL,
  "contactName" TEXT,
  "title" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "segment" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "intentScore" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'vega',
  "notes" TEXT,
  "nextStep" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VegaLead_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VegaLeadQuery"
ADD CONSTRAINT "VegaLeadQuery_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VegaLeadQuery"
ADD CONSTRAINT "VegaLeadQuery_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VegaLead"
ADD CONSTRAINT "VegaLead_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VegaLead"
ADD CONSTRAINT "VegaLead_queryId_fkey"
FOREIGN KEY ("queryId") REFERENCES "VegaLeadQuery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "VegaLeadQuery_organizationId_createdAt_idx" ON "VegaLeadQuery"("organizationId", "createdAt");
CREATE INDEX "VegaLeadQuery_requestedById_createdAt_idx" ON "VegaLeadQuery"("requestedById", "createdAt");
CREATE INDEX "VegaLead_organizationId_status_createdAt_idx" ON "VegaLead"("organizationId", "status", "createdAt");
CREATE INDEX "VegaLead_queryId_idx" ON "VegaLead"("queryId");
