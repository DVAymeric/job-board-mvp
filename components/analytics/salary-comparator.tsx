import type { JobWithRelations } from "@/lib/types";
import { STATUS } from "@/lib/constants";
import { formatSalary, normalizeAnnualSalary } from "@/lib/salary";

export function SalaryComparator({ jobs }: { jobs: JobWithRelations[] }) {
  const ranked = jobs
    .filter((job) => job.status === STATUS.INTERVIEW && job.salaryAmount !== null)
    .map((job) => ({
      job,
      annualized: normalizeAnnualSalary(job.salaryAmount, job.salaryType) ?? 0,
    }))
    .sort((a, b) => b.annualized - a.annualized);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        Comparateur de rémunération (candidatures en entretien)
      </p>
      {ranked.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune candidature en entretien avec une rémunération renseignée
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-1.5 font-medium">Offre</th>
              <th className="py-1.5 font-medium">Entreprise</th>
              <th className="py-1.5 font-medium">Rémunération</th>
              <th className="py-1.5 font-medium">Équivalent annuel</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ job, annualized }) => (
              <tr key={job.id} className="border-b border-border last:border-0">
                <td className="py-1.5">{job.title ?? job.url}</td>
                <td className="py-1.5">{job.companyName ?? "—"}</td>
                <td className="py-1.5 font-mono">
                  {formatSalary(job.salaryAmount, job.salaryType)}
                </td>
                <td className="py-1.5 font-mono">
                  {formatSalary(annualized, "ANNUAL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
