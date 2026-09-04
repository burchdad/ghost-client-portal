ALTER TABLE "VegaLeadQuery" ADD COLUMN "requestedCount" INTEGER,
  ADD COLUMN "sourceReport" JSONB;

CREATE TABLE "VegaLeadQueryResult" (
  "queryId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  CONSTRAINT "VegaLeadQueryResult_pkey" PRIMARY KEY ("queryId", "leadId"),
  CONSTRAINT "VegaLeadQueryResult_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "VegaLeadQuery"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VegaLeadQueryResult_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "VegaLead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "VegaLeadQueryResult_leadId_idx" ON "VegaLeadQueryResult"("leadId");
INSERT INTO "VegaLeadQueryResult" ("queryId", "leadId")
  SELECT lead."queryId", lead."id" FROM "VegaLead" lead
  JOIN "VegaLeadQuery" query ON query."id" = lead."queryId" AND query."organizationId" = lead."organizationId";
