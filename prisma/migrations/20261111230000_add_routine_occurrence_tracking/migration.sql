-- CreateTable
CREATE TABLE "LifeOSRoutineOccurrence" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeOSRoutineOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LifeOSRoutineOccurrence_ownerId_routineId_date_key" ON "LifeOSRoutineOccurrence"("ownerId", "routineId", "date");

-- CreateIndex
CREATE INDEX "LifeOSRoutineOccurrence_ownerId_date_idx" ON "LifeOSRoutineOccurrence"("ownerId", "date");

-- CreateIndex
CREATE INDEX "LifeOSRoutineOccurrence_ownerId_status_date_idx" ON "LifeOSRoutineOccurrence"("ownerId", "status", "date");

-- CreateIndex
CREATE INDEX "LifeOSRoutineOccurrence_routineId_idx" ON "LifeOSRoutineOccurrence"("routineId");

-- AddForeignKey
ALTER TABLE "LifeOSRoutineOccurrence" ADD CONSTRAINT "LifeOSRoutineOccurrence_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "LifeOSRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
