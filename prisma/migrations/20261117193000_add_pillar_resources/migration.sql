CREATE TABLE "LifeOSPillarResource" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "pillarKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'LINK',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeOSPillarResource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifeOSPillarResource_ownerId_pillarKey_category_idx"
ON "LifeOSPillarResource"("ownerId", "pillarKey", "category");

CREATE INDEX "LifeOSPillarResource_ownerId_favorite_updatedAt_idx"
ON "LifeOSPillarResource"("ownerId", "favorite", "updatedAt");
