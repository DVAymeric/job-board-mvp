import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActiveMonthCard } from "@/components/analytics/active-month-card";

describe("ActiveMonthCard", () => {
  it("shows the month name and its candidate count", () => {
    render(<ActiveMonthCard month={{ label: "Août", count: 3 }} />);
    expect(screen.getByText("Août")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/candidatures ce mois-ci/)).toBeInTheDocument();
  });

  it("uses the singular form for a single application", () => {
    render(<ActiveMonthCard month={{ label: "Août", count: 1 }} />);
    expect(screen.getByText(/^candidature ce mois-ci$/)).toBeInTheDocument();
  });

  it("shows a graceful empty state when there is no data", () => {
    render(<ActiveMonthCard month={null} />);
    expect(screen.getByText(/Aucune candidature récente/)).toBeInTheDocument();
  });
});
