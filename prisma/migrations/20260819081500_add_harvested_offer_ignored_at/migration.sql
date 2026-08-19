-- AlterTable
ALTER TABLE "HarvestedOffer" ADD COLUMN "ignoredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "HarvestedOffer_userId_importedJobId_ignoredAt_idx" ON "HarvestedOffer"("userId", "importedJobId", "ignoredAt");
