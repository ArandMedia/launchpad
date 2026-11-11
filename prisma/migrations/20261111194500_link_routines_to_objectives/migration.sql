ALTER TABLE "LifeOSRoutine"
ADD COLUMN "objectiveId" TEXT;

CREATE INDEX "LifeOSRoutine_objectiveId_idx" ON "LifeOSRoutine"("objectiveId");

ALTER TABLE "LifeOSRoutine"
ADD CONSTRAINT "LifeOSRoutine_objectiveId_fkey"
FOREIGN KEY ("objectiveId") REFERENCES "LifeOSGoal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
