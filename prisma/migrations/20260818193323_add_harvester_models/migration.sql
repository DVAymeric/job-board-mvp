-- CreateEnum
CREATE TYPE "OfferContractType" AS ENUM ('APPRENTISSAGE', 'PROFESSIONNALISATION', 'STAGE', 'AUTRE');

-- CreateEnum
CREATE TYPE "OfferRemotePolicy" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OfferLifecycle" AS ENUM ('ACTIVE', 'EXPIRED', 'DEAD_LINK');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "romeCodes" TEXT[],
    "keywords" TEXT[],
    "contractTypes" "OfferContractType"[],
    "schedule" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestedOffer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceOfferId" TEXT NOT NULL,
    "originSource" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "applyUrl" TEXT,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyNormalizedName" TEXT NOT NULL,
    "companySiret" TEXT,
    "companyWebsite" TEXT,
    "locationLabel" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "department" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "contractType" "OfferContractType" NOT NULL,
    "durationMonths" INTEGER,
    "startDate" TEXT,
    "romeCodes" TEXT[],
    "descriptionText" TEXT NOT NULL,
    "descriptionHtml" TEXT,
    "salary" JSONB,
    "remotePolicy" "OfferRemotePolicy",
    "postedAt" TEXT,
    "expiresAt" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "lifecycle" "OfferLifecycle" NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "importedJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HarvestedOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorRun" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "rawCount" INTEGER NOT NULL,
    "normalizedCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "httpStatusesSeen" INTEGER[],
    "ok" BOOLEAN NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "ConnectorRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_userId_slug_key" ON "Campaign"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "HarvestedOffer_importedJobId_key" ON "HarvestedOffer"("importedJobId");

-- CreateIndex
CREATE INDEX "HarvestedOffer_userId_campaignId_idx" ON "HarvestedOffer"("userId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "HarvestedOffer_userId_dedupKey_key" ON "HarvestedOffer"("userId", "dedupKey");

-- CreateIndex
CREATE INDEX "ConnectorRun_campaignId_idx" ON "ConnectorRun"("campaignId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestedOffer" ADD CONSTRAINT "HarvestedOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestedOffer" ADD CONSTRAINT "HarvestedOffer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestedOffer" ADD CONSTRAINT "HarvestedOffer_importedJobId_fkey" FOREIGN KEY ("importedJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectorRun" ADD CONSTRAINT "ConnectorRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
