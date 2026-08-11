import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import type { FunnelStage } from "@/lib/analytics";

const stages: FunnelStage[] = [
  { status: "TO_APPLY", label: "À postuler", count: 10, conversionFromPrevious: null },
  { status: "APPLIED", label: "Postulé", count: 6, conversionFromPrevious: 60 },
  { status: "INTERVIEW", label: "Entretien", count: 2, conversionFromPrevious: 33.3 },
  { status: "REJECTED", label: "Refusé", count: 1, conversionFromPrevious: 50 },
];

describe("FunnelChart", () => {
  it("shows every stage's label and count", () => {
    render(<FunnelChart stages={stages} />);
    for (const stage of stages) {
      expect(screen.getAllByText(stage.label).length).toBeGreaterThan(0);
    }
  });

  it("shows the conversion rate for stages after the first", () => {
    render(<FunnelChart stages={stages} />);
    expect(screen.getAllByText(/60%/).length).toBeGreaterThan(0);
  });

  it("shows a dash instead of a rate for the first stage", () => {
    render(<FunnelChart stages={stages} />);
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("—");
  });

  it("exposes a full accessible table with one row per stage", () => {
    render(<FunnelChart stages={stages} />);
    expect(screen.getAllByRole("row")).toHaveLength(stages.length + 1);
  });
});
