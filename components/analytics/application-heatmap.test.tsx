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

  it("shows the month labels row by default", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    render(<ApplicationHeatmap days={days} />);
    expect(screen.getByTestId("heatmap-month-labels")).toBeInTheDocument();
  });

  describe("compact mode", () => {
    it("renders only the last 12 weeks of cells", () => {
      // Aug 15 2026 is a Saturday, so the window ends on a complete week
      // and the expected count isn't skewed by a partial trailing week.
      const days = buildHeatmapDays([], new Date(2026, 7, 15));
      const { container } = render(<ApplicationHeatmap days={days} compact />);
      const cells = container.querySelectorAll("[data-heatmap-cell]");
      expect(cells).toHaveLength(12 * 7);
    });

    it("hides the legend", () => {
      const days = buildHeatmapDays([], new Date(2026, 7, 12));
      const { container } = render(<ApplicationHeatmap days={days} compact />);
      expect(container.querySelectorAll("[data-legend-cell]")).toHaveLength(0);
    });

    it("hides the month labels row", () => {
      const days = buildHeatmapDays([], new Date(2026, 7, 12));
      render(<ApplicationHeatmap days={days} compact />);
      expect(screen.queryByTestId("heatmap-month-labels")).not.toBeInTheDocument();
    });
  });

  describe("levels: 3", () => {
    it("renders a 3-step intensity legend instead of 6", () => {
      const days = buildHeatmapDays([], new Date(2026, 7, 12), 3);
      const { container } = render(<ApplicationHeatmap days={days} levels={3} />);
      const legendCells = container.querySelectorAll("[data-legend-cell]");
      // one empty swatch + 3 intensity levels
      expect(legendCells).toHaveLength(4);
    });

    it("still renders one cell per day in the window", () => {
      const days = buildHeatmapDays([], new Date(2026, 7, 12), 3);
      const { container } = render(<ApplicationHeatmap days={days} levels={3} />);
      const cells = container.querySelectorAll("[data-heatmap-cell]");
      expect(cells).toHaveLength(days.length);
    });
  });
});
