-- Scheduling is optional so every existing objective remains valid and
-- unscheduled. Timestamptz preserves precise instants; the application renders
-- and edits them in the owner's America/Chicago timezone.
ALTER TABLE "LifeOSGoal"
ADD COLUMN "startAt" TIMESTAMPTZ(3),
ADD COLUMN "endAt" TIMESTAMPTZ(3);

CREATE INDEX "LifeOSGoal_ownerId_startAt_idx" ON "LifeOSGoal"("ownerId", "startAt");
