/*
  Warnings:

  - You are about to drop the column `titleCompany` on the `Job` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "linkedinUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "JobTag" (
    "jobId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("jobId", "tagId"),
    CONSTRAINT "JobTag_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StatusHistory_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "companyName" TEXT,
    "companyLogoUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TO_APPLY',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "lastFollowUp" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Backfill: split legacy "titleCompany" into "title"/"companyName" (best-effort on
-- the " - " / " chez " separators used by the manual entry form), falling back to
-- "title" = titleCompany when no separator is found.
INSERT INTO "new_Job" ("createdAt", "id", "lastFollowUp", "status", "updatedAt", "url", "title", "companyName")
SELECT
    "createdAt", "id", "lastFollowUp", "status", "updatedAt", "url",
    CASE
        WHEN "titleCompany" IS NULL THEN NULL
        WHEN instr("titleCompany", ' - ') > 0 THEN trim(substr("titleCompany", 1, instr("titleCompany", ' - ') - 1))
        WHEN instr("titleCompany", ' chez ') > 0 THEN trim(substr("titleCompany", 1, instr("titleCompany", ' chez ') - 1))
        ELSE "titleCompany"
    END AS "title",
    CASE
        WHEN "titleCompany" IS NULL THEN NULL
        WHEN instr("titleCompany", ' - ') > 0 THEN trim(substr("titleCompany", instr("titleCompany", ' - ') + 3))
        WHEN instr("titleCompany", ' chez ') > 0 THEN trim(substr("titleCompany", instr("titleCompany", ' chez ') + 6))
        ELSE NULL
    END AS "companyName"
FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_url_key" ON "Job"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
