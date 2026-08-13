import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusDetailCard } from "@/components/analytics/status-detail-card";
import type { FunnelStage } from "@/lib/analytics";

const stages: FunnelStage[] = [
  { status: "TO_APPLY", label: "À postuler", count: 3, conversionFromPrevious: null },
  { status: "APPLIED", label: "Postulé", count: 2, conversionFromPrevious: 66.7 },
  { status: "INTERVIEW", label: "Entretien", count: 1, conversionFromPrevious: 50 },
  { status: "REJECTED", label: "Refusé", count: 1, conversionFromPrevious: 100 },
];

describe("StatusDetailCard", () => {
  it("renders one block per stage with its label, count and conversion", () => {
    render(<StatusDetailCard stages={stages} />);
    expect(screen.getByText("À postuler")).toBeInTheDocument();
    expect(screen.getByText("Postulé")).toBeInTheDocument();
    expect(screen.getByText("Entretien")).toBeInTheDocument();
    expect(screen.getByText("Refusé")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows a dash instead of a rate for the first stage", () => {
    render(<StatusDetailCard stages={stages} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("spans the full width of the bento grid", () => {
    const { container } = render(<StatusDetailCard stages={stages} />);
    const card = container.querySelector('[data-slot="bento-card"]');
    expect(card).toHaveClass("md:col-span-4");
  });
});
