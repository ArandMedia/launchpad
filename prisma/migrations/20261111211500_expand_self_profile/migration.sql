ALTER TABLE "LifeOSPrinciple"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'CONVICTION',
  ADD COLUMN "why" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "importance" INTEGER NOT NULL DEFAULT 3;

CREATE INDEX "LifeOSPrinciple_ownerId_domainKey_kind_importance_idx"
  ON "LifeOSPrinciple"("ownerId", "domainKey", "kind", "importance");
