import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationHeatmap } from "@/components/analytics/application-heatmap";
import { buildHeatmapDays } from "@/lib/heatmap";

describe("ApplicationHeatmap", () => {
  it("renders one cell per day in the window", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    const { container } = render(<ApplicationHeatmap days={days} />);
    const cells = container.querySelectorAll("[data-heatmap-cell]");
    expect(cells).toHaveLength(days.length);
  });

  it("shows a tooltip with the exact date and count on each cell", () => {
    const jobs = [{ createdAt: new Date(2026, 7, 12) }, { createdAt: new Date(2026, 7, 12) }];
    const days = buildHeatmapDays(jobs, new Date(2026, 7, 12));
    render(<ApplicationHeatmap days={days} />);
    const cell = screen.getByTitle(/12 août 2026.*2 candidatures/i);
    expect(cell).toBeInTheDocument();
  });

  it("renders a 5-step intensity legend using the --chart-* tokens", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    const { container } = render(<ApplicationHeatmap days={days} />);
    const legendCells = container.querySelectorAll("[data-legend-cell]");
    // one empty swatch + 5 intensity levels
    expect(legendCells).toHaveLength(6);
  });
});
