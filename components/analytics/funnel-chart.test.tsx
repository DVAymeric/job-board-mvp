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
  it("shows every stage's label", () => {
    render(<FunnelChart stages={stages} />);
    for (const stage of stages) {
      expect(screen.getByText(stage.label)).toBeInTheDocument();
    }
  });

  it("shows the count and conversion rate together for stages after the first", () => {
    render(<FunnelChart stages={stages} />);
    expect(screen.getByText("6 · 60%")).toBeInTheDocument();
  });

  it("shows just the raw count, with no rate, for the first stage", () => {
    render(<FunnelChart stages={stages} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.queryByText(/10 ·/)).not.toBeInTheDocument();
  });

  it("exposes an accessible image role describing the whole funnel", () => {
    render(<FunnelChart stages={stages} />);
    expect(
      screen.getByRole("img", { name: /funnel de conversion/i })
    ).toBeInTheDocument();
  });

  it("sizes each bar proportionally to the largest stage's count", () => {
    const { container } = render(<FunnelChart stages={stages} />);
    const bars = container.querySelectorAll("[data-funnel-bar]");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "60%" }); // 6/10
  });

  it("gives a job-less stage a hairline instead of a zero-width bar", () => {
    const emptyStages: FunnelStage[] = [
      { status: "TO_APPLY", label: "À postuler", count: 0, conversionFromPrevious: null },
    ];
    const { container } = render(<FunnelChart stages={emptyStages} />);
    const bar = container.querySelector("[data-funnel-bar]");
    expect(bar).toHaveStyle({ width: "0%" });
  });
});
