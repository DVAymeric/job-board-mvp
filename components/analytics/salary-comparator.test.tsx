import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SalaryComparator } from "@/components/analytics/salary-comparator";
import type { JobWithRelations } from "@/lib/types";

function job(overrides: Partial<JobWithRelations>): JobWithRelations {
  return {
    id: "job-1",
    url: "https://example.com/job",
    title: "Développeur",
    companyName: "Acme",
    companyLogoUrl: null,
    notes: null,
    status: "INTERVIEW",
    archived: false,
    order: 0,
    lastFollowUp: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    salaryAmount: null,
    salaryType: null,
    resumeUrl: null,
    coverLetterUrl: null,
    tags: [],
    contacts: [],
    statusHistory: [],
    ...overrides,
  };
}

describe("SalaryComparator", () => {
  it("shows an empty state when no interview-stage job has a salary", () => {
    render(<SalaryComparator jobs={[job({ salaryAmount: null, salaryType: null })]} />);
    expect(
      screen.getByText(/aucune candidature en entretien avec une rémunération renseignée/i)
    ).toBeInTheDocument();
  });

  it("lists jobs with a salary, ranked by annualized amount", () => {
    render(
      <SalaryComparator
        jobs={[
          job({
            id: "job-tjm",
            title: "Développeur Freelance",
            salaryAmount: 400,
            salaryType: "DAILY_RATE",
          }),
          job({
            id: "job-salary",
            title: "Développeur CDI",
            salaryAmount: 50000,
            salaryType: "ANNUAL",
          }),
        ]}
      />
    );

    const rows = screen.getAllByRole("row");
    // header + 2 data rows; the higher annualized value (400*218=87 200) comes first
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("Développeur Freelance");
    expect(rows[2]).toHaveTextContent("Développeur CDI");
  });

  it("excludes jobs that are not at the interview stage", () => {
    render(
      <SalaryComparator
        jobs={[
          job({ status: "APPLIED", salaryAmount: 50000, salaryType: "ANNUAL" }),
        ]}
      />
    );
    expect(screen.queryAllByRole("row")).toHaveLength(0);
    expect(
      screen.getByText(/aucune candidature en entretien avec une rémunération renseignée/i)
    ).toBeInTheDocument();
  });
});
