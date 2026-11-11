ALTER TABLE "LifeOSGoal"
ADD COLUMN "targetDate" DATE;

CREATE INDEX "LifeOSGoal_ownerId_targetDate_idx"
ON "LifeOSGoal"("ownerId", "targetDate");
