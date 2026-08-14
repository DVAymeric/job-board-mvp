-- CreateEnum
CREATE TYPE "EnrichmentStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "enrichmentStatus" "EnrichmentStatus" NOT NULL DEFAULT 'DONE';
