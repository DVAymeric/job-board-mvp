import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArchivesView } from "@/components/archives/archives-view";

export default async function ArchivesPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const jobs = await prisma.job.findMany({
    where: { userId, archived: true },
    include: {
      tags: { include: { tag: true } },
      contacts: true,
      statusHistory: { orderBy: { changedAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col p-4">
      <ArchivesView initialJobs={jobs} />
    </div>
  );
}
