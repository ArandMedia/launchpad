-- Stable optional keys let structured check-ins reuse metric definitions.
-- Existing custom definitions remain valid with a null key.
ALTER TABLE "LifeOSMetricDefinition" ADD COLUMN "metricKey" TEXT;
CREATE UNIQUE INDEX "LifeOSMetricDefinition_ownerId_metricKey_key" ON "LifeOSMetricDefinition"("ownerId", "metricKey");
