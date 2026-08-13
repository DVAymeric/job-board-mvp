import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewCard } from "@/components/analytics/overview-card";

describe("OverviewCard", () => {
  it("shows the total and a chip per status with its count and label", () => {
    render(
      <OverviewCard
        total={10}
        statusCounts={{
          TO_APPLY: 4,
          APPLIED: 3,
          INTERVIEW: 2,
          REJECTED: 1,
        }}
      />
    );
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText(/candidatures suivies au total/)).toBeInTheDocument();
    expect(screen.getByText("4", { selector: "b" })).toBeInTheDocument();
    expect(screen.getByText("À postuler")).toBeInTheDocument();
    expect(screen.getByText("3", { selector: "b" })).toBeInTheDocument();
    expect(screen.getByText("Postulé")).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "b" })).toBeInTheDocument();
    expect(screen.getByText("Entretien")).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "b" })).toBeInTheDocument();
    expect(screen.getByText("Refusé")).toBeInTheDocument();
  });

  it("uses the singular form for a total of one", () => {
    render(
      <OverviewCard
        total={1}
        statusCounts={{ TO_APPLY: 1, APPLIED: 0, INTERVIEW: 0, REJECTED: 0 }}
      />
    );
    expect(screen.getByText(/^candidature suivie au total$/)).toBeInTheDocument();
  });
});
