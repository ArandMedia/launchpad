-- LifeOS is intentionally owner-scoped at the application layer. These
-- additive tables do not modify or backfill any existing LaunchPAD data.
CREATE TABLE "LifeOSGoal" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "parentId" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeOSGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifeOSReview" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "intended" TEXT NOT NULL DEFAULT '',
    "actual" TEXT NOT NULL DEFAULT '',
    "learned" TEXT NOT NULL DEFAULT '',
    "next" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeOSReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifeOSGoal_ownerId_createdAt_idx" ON "LifeOSGoal"("ownerId", "createdAt");
CREATE INDEX "LifeOSGoal_ownerId_parentId_idx" ON "LifeOSGoal"("ownerId", "parentId");
CREATE UNIQUE INDEX "LifeOSReview_ownerId_date_key" ON "LifeOSReview"("ownerId", "date");
CREATE INDEX "LifeOSReview_ownerId_date_idx" ON "LifeOSReview"("ownerId", "date");
