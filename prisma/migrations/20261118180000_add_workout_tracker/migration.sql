CREATE TABLE "LifeOSWorkout" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeOSWorkout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifeOSWorkout_ownerId_occurredAt_idx" ON "LifeOSWorkout"("ownerId", "occurredAt");
