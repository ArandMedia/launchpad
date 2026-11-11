CREATE TABLE "LifeOSJournalEntry" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'NOTE',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "inkData" TEXT NOT NULL DEFAULT '',
  "occurredOn" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LifeOSJournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifeOSJournalEntry_ownerId_occurredOn_idx"
ON "LifeOSJournalEntry"("ownerId", "occurredOn");

CREATE INDEX "LifeOSJournalEntry_ownerId_kind_updatedAt_idx"
ON "LifeOSJournalEntry"("ownerId", "kind", "updatedAt");
