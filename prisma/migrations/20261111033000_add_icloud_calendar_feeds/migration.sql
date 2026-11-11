CREATE TABLE "LifeOSCalendarFeed" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#8b5cf6',
  "urlCiphertext" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "authTag" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LifeOSCalendarFeed_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifeOSCalendarFeed_ownerId_active_idx" ON "LifeOSCalendarFeed"("ownerId", "active");
