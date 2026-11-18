CREATE TABLE "LifeOSWorkoutPlan" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "scheduledFor" DATE NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "workoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeOSWorkoutPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LifeOSWorkoutPlan_workoutId_key" ON "LifeOSWorkoutPlan"("workoutId");
CREATE UNIQUE INDEX "LifeOSWorkoutPlan_ownerId_scheduledFor_key" ON "LifeOSWorkoutPlan"("ownerId", "scheduledFor");
CREATE INDEX "LifeOSWorkoutPlan_ownerId_scheduledFor_idx" ON "LifeOSWorkoutPlan"("ownerId", "scheduledFor");
ALTER TABLE "LifeOSWorkoutPlan" ADD CONSTRAINT "LifeOSWorkoutPlan_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "LifeOSWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
