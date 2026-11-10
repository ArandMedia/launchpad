-- Daily execution blocks remain separate from long-horizon objective spans.
-- Timestamps are absolute instants; the UI renders them in America/Chicago.
CREATE TABLE "LifeOSTimeBlock" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "objectiveId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifeOSTimeBlock_time_order_check" CHECK ("endAt" > "startAt"),
    CONSTRAINT "LifeOSTimeBlock_status_check" CHECK ("status" IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
    CONSTRAINT "LifeOSTimeBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifeOSTimeBlock_ownerId_startAt_idx" ON "LifeOSTimeBlock"("ownerId", "startAt");
CREATE INDEX "LifeOSTimeBlock_ownerId_status_idx" ON "LifeOSTimeBlock"("ownerId", "status");
CREATE INDEX "LifeOSTimeBlock_objectiveId_idx" ON "LifeOSTimeBlock"("objectiveId");

ALTER TABLE "LifeOSTimeBlock"
ADD CONSTRAINT "LifeOSTimeBlock_objectiveId_fkey"
FOREIGN KEY ("objectiveId") REFERENCES "LifeOSGoal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
