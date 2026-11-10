-- Some early LifeOS environments created the goal table before completion
-- timestamps were added. Keep the repair idempotent so fresh databases, where
-- the preceding migration already creates the column, remain unchanged.
ALTER TABLE "LifeOSGoal"
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
