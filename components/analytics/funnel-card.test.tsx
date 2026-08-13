import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FunnelCard } from "@/components/analytics/funnel-card";
import type { FunnelStage } from "@/lib/analytics";

const stages: FunnelStage[] = [
  { status: "TO_APPLY", label: "À postuler", count: 3, conversionFromPrevious: null },
  { status: "APPLIED", label: "Postulé", count: 2, conversionFromPrevious: 66.7 },
  { status: "INTERVIEW", label: "Entretien", count: 1, conversionFromPrevious: 50 },
  { status: "REJECTED", label: "Refusé", count: 1, conversionFromPrevious: 100 },
];

describe("FunnelCard", () => {
  it("renders the card heading and the funnel chart bars", () => {
    render(<FunnelCard stages={stages} />);
    expect(screen.getByText("De l'idée à l'entretien")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /funnel de conversion/i })).toBeInTheDocument();
    expect(screen.getByText("À postuler")).toBeInTheDocument();
  });
});
