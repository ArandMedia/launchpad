CREATE TABLE "LifeOSDecisionPlacement" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "contextSnapshot" TEXT NOT NULL DEFAULT '',
    "dueAtSnapshot" TIMESTAMPTZ(3),
    "quadrant" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeOSDecisionPlacement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LifeOSDecisionPlacement_ownerId_date_sourceKind_sourceId_key"
ON "LifeOSDecisionPlacement"("ownerId", "date", "sourceKind", "sourceId");

CREATE INDEX "LifeOSDecisionPlacement_ownerId_date_quadrant_idx"
ON "LifeOSDecisionPlacement"("ownerId", "date", "quadrant");
