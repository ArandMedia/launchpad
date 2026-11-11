ALTER TABLE "LifeOSTimeBlock"
ADD COLUMN "projectId" TEXT,
ADD COLUMN "taskId" TEXT,
ADD COLUMN "milestoneId" TEXT;

CREATE INDEX "LifeOSTimeBlock_projectId_idx" ON "LifeOSTimeBlock"("projectId");
CREATE INDEX "LifeOSTimeBlock_taskId_idx" ON "LifeOSTimeBlock"("taskId");
CREATE INDEX "LifeOSTimeBlock_milestoneId_idx" ON "LifeOSTimeBlock"("milestoneId");

ALTER TABLE "LifeOSTimeBlock"
ADD CONSTRAINT "LifeOSTimeBlock_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LifeOSTimeBlock"
ADD CONSTRAINT "LifeOSTimeBlock_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LifeOSTimeBlock"
ADD CONSTRAINT "LifeOSTimeBlock_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
