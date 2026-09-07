-- CreateTable
CREATE TABLE "CronLock" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronLock_pkey" PRIMARY KEY ("id")
);
