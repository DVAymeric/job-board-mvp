import { prisma } from "@/lib/prisma";
import { SalaryComparator } from "@/components/analytics/salary-comparator";

export default async function ComparateurPage() {
  const jobs = await prisma.job.findMany({
    where: { archived: false },
    include: {
      tags: { include: { tag: true } },
      contacts: true,
      statusHistory: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="space-y-1">
        <h1 className="font-heading text-xl text-heading">Comparateur</h1>
        <p className="text-sm text-muted-foreground">
          Compare la rémunération des candidatures actuellement en entretien.
        </p>
      </div>
      <SalaryComparator jobs={jobs} />
    </div>
  );
}
