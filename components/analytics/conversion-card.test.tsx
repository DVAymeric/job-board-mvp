import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConversionCard } from "@/components/analytics/conversion-card";

describe("ConversionCard", () => {
  it("shows the conversion rate and the underlying fraction", () => {
    render(<ConversionCard rate={50} appliedCount={2} interviewCount={1} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(
      screen.getByText(/1 candidature sur 2 postulées obtient un entretien/)
    ).toBeInTheDocument();
  });

  it("pluralizes the fraction sentence for more than one interview", () => {
    render(<ConversionCard rate={50} appliedCount={4} interviewCount={2} />);
    expect(
      screen.getByText(/2 candidatures sur 4 postulées obtient un entretien/)
    ).toBeInTheDocument();
  });

  it("shows a graceful empty state when nothing has been applied to yet", () => {
    render(<ConversionCard rate={null} appliedCount={0} interviewCount={0} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(/Aucune candidature postulée/)).toBeInTheDocument();
  });
});
