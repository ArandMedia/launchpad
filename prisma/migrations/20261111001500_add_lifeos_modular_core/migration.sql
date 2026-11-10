-- Additive modular LifeOS core. Existing goals remain the outcome records,
-- existing blocks remain execution records, and existing AARs remain intact.
ALTER TABLE "LifeOSGoal"
  ADD COLUMN "domainKey" TEXT NOT NULL DEFAULT 'OMNIS',
  ADD COLUMN "targetValue" DOUBLE PRECISION,
  ADD COLUMN "targetUnit" TEXT NOT NULL DEFAULT '';

CREATE INDEX "LifeOSGoal_ownerId_domainKey_idx" ON "LifeOSGoal"("ownerId", "domainKey");

CREATE TABLE "LifeOSDomainState" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "domainKey" TEXT NOT NULL,
  "currentState" TEXT NOT NULL DEFAULT '',
  "desiredState" TEXT NOT NULL DEFAULT '',
  "gap" TEXT NOT NULL DEFAULT '',
  "activeSystem" TEXT NOT NULL DEFAULT '',
  "nextActions" TEXT NOT NULL DEFAULT '',
  "evidence" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LifeOSDomainState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LifeOSDomainState_ownerId_domainKey_key" ON "LifeOSDomainState"("ownerId", "domainKey");
CREATE INDEX "LifeOSDomainState_ownerId_updatedAt_idx" ON "LifeOSDomainState"("ownerId", "updatedAt");

CREATE TABLE "LifeOSRoutine" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "domainKey" TEXT NOT NULL,
  "title" TEXT NOT NULL, "cadence" TEXT NOT NULL DEFAULT 'WEEKLY',
  "active" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LifeOSRoutine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LifeOSRoutine_ownerId_domainKey_active_idx" ON "LifeOSRoutine"("ownerId", "domainKey", "active");

CREATE TABLE "LifeOSAction" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "domainKey" TEXT NOT NULL,
  "title" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "dueAt" TIMESTAMPTZ(3),
  "legacyGoalId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeOSAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LifeOSAction_ownerId_domainKey_status_idx" ON "LifeOSAction"("ownerId", "domainKey", "status");
CREATE INDEX "LifeOSAction_ownerId_dueAt_idx" ON "LifeOSAction"("ownerId", "dueAt");

CREATE TABLE "LifeOSMetricDefinition" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "domainKey" TEXT NOT NULL,
  "name" TEXT NOT NULL, "unit" TEXT NOT NULL DEFAULT '', "direction" TEXT NOT NULL DEFAULT 'NEUTRAL',
  "sensitivity" TEXT NOT NULL DEFAULT 'STANDARD', "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LifeOSMetricDefinition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LifeOSMetricDefinition_ownerId_domainKey_active_idx" ON "LifeOSMetricDefinition"("ownerId", "domainKey", "active");

CREATE TABLE "LifeOSMeasurement" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "metricId" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL, "note" TEXT NOT NULL DEFAULT '', "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "observedAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifeOSMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LifeOSMeasurement_ownerId_metricId_observedAt_idx" ON "LifeOSMeasurement"("ownerId", "metricId", "observedAt");

CREATE TABLE "LifeOSHealthMeasurement" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "metricId" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL, "iv" TEXT NOT NULL, "authTag" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'MANUAL', "observedAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifeOSHealthMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LifeOSHealthMeasurement_ownerId_metricId_observedAt_idx" ON "LifeOSHealthMeasurement"("ownerId", "metricId", "observedAt");

CREATE TABLE "LifeOSPrinciple" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "domainKey" TEXT NOT NULL,
  "title" TEXT NOT NULL, "statement" TEXT NOT NULL DEFAULT '', "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LifeOSPrinciple_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LifeOSPrinciple_ownerId_domainKey_active_idx" ON "LifeOSPrinciple"("ownerId", "domainKey", "active");

CREATE TABLE "LifeOSRelationshipCommitment" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "area" TEXT NOT NULL,
  "title" TEXT NOT NULL, "cadence" TEXT NOT NULL DEFAULT '', "note" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeOSRelationshipCommitment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LifeOSRelationshipCommitment_ownerId_area_active_idx" ON "LifeOSRelationshipCommitment"("ownerId", "area", "active");

CREATE TABLE "LifeOSReviewCycle" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "period" TEXT NOT NULL,
  "periodStart" DATE NOT NULL, "domainKey" TEXT, "observation" TEXT NOT NULL DEFAULT '',
  "recommendation" TEXT NOT NULL DEFAULT '', "decision" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LifeOSReviewCycle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LifeOSReviewCycle_ownerId_period_periodStart_domainKey_key" ON "LifeOSReviewCycle"("ownerId", "period", "periodStart", "domainKey");
CREATE INDEX "LifeOSReviewCycle_ownerId_periodStart_idx" ON "LifeOSReviewCycle"("ownerId", "periodStart");

CREATE TABLE "LifeOSIntegrationConnection" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "providerKey" TEXT NOT NULL,
  "domainKey" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
  "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[], "consentedAt" TIMESTAMP(3), "disconnectedAt" TIMESTAMP(3),
  "retentionDays" INTEGER NOT NULL DEFAULT 365, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "LifeOSIntegrationConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LifeOSIntegrationConnection_ownerId_providerKey_key" ON "LifeOSIntegrationConnection"("ownerId", "providerKey");
CREATE INDEX "LifeOSIntegrationConnection_ownerId_domainKey_status_idx" ON "LifeOSIntegrationConnection"("ownerId", "domainKey", "status");

CREATE TABLE "LifeOSActivity" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "domainKey" TEXT NOT NULL,
  "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "summary" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifeOSActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LifeOSActivity_ownerId_createdAt_idx" ON "LifeOSActivity"("ownerId", "createdAt");
CREATE INDEX "LifeOSActivity_ownerId_domainKey_createdAt_idx" ON "LifeOSActivity"("ownerId", "domainKey", "createdAt");

ALTER TABLE "LifeOSMeasurement" ADD CONSTRAINT "LifeOSMeasurement_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "LifeOSMetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifeOSHealthMeasurement" ADD CONSTRAINT "LifeOSHealthMeasurement_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "LifeOSMetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
