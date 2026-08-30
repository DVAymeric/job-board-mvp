-- CreateEnum
CREATE TYPE "DiscoveryPlatform" AS ENUM ('WORKDAY', 'SMARTRECRUITERS', 'TALENTSOFT', 'DIGITALRECRUITERS');

-- CreateEnum
CREATE TYPE "DiscoveredTargetStatus" AS ENUM ('PENDING', 'ADDED', 'REJECTED');

-- CreateTable
CREATE TABLE "DiscoveryProbe" (
    "id" TEXT NOT NULL,
    "companySlug" TEXT NOT NULL,
    "platform" "DiscoveryPlatform" NOT NULL,
    "found" BOOLEAN NOT NULL,
    "target" JSONB,
    "probedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryProbe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companySlug" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "platform" "DiscoveryPlatform" NOT NULL,
    "target" JSONB NOT NULL,
    "status" "DiscoveredTargetStatus" NOT NULL DEFAULT 'PENDING',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "DiscoveredTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryProbe_companySlug_platform_key" ON "DiscoveryProbe"("companySlug", "platform");

-- CreateIndex
CREATE INDEX "DiscoveredTarget_userId_status_idx" ON "DiscoveredTarget"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredTarget_userId_companySlug_platform_key" ON "DiscoveredTarget"("userId", "companySlug", "platform");

-- AddForeignKey
ALTER TABLE "DiscoveredTarget" ADD CONSTRAINT "DiscoveredTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
