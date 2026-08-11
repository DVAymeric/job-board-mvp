import { prisma } from "@/lib/prisma";
import { Board } from "@/components/board/board";

export default async function BoardPage() {
  const jobs = await prisma.job.findMany({
    where: { archived: false },
    include: {
      tags: { include: { tag: true } },
      contacts: true,
      statusHistory: { orderBy: { changedAt: "asc" } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex flex-1 flex-col p-4">
      <Board initialJobs={jobs} />
    </div>
  );
}
