-- CreateEnum
CREATE TYPE "JobContractType" AS ENUM ('CDI', 'CDD', 'ALTERNANCE', 'STAGE', 'FREELANCE', 'INTERIM', 'AUTRE');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "contractType" "JobContractType";
