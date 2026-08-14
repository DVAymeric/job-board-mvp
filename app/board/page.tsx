import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BOARD_JOBS_SAFETY_LIMIT } from "@/lib/constants";
import { Board } from "@/components/board/board";

export default async function BoardPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const jobs = await prisma.job.findMany({
    where: { userId, archived: false },
    include: {
      tags: { include: { tag: true } },
      contacts: true,
      statusHistory: { orderBy: { changedAt: "asc" } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: BOARD_JOBS_SAFETY_LIMIT,
  });

  return (
    <div className="flex flex-1 flex-col p-4">
      <Board initialJobs={jobs} />
    </div>
  );
}
