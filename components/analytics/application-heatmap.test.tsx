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

  it("also exposes the exact date and count as aria-label, not just title — title alone isn't reliably announced by screen readers", () => {
    const jobs = [{ createdAt: new Date(2026, 7, 12) }, { createdAt: new Date(2026, 7, 12) }];
    const days = buildHeatmapDays(jobs, new Date(2026, 7, 12));
    const { container } = render(<ApplicationHeatmap days={days} />);
    const cell = container.querySelector(
      '[data-heatmap-cell][title*="12 août 2026"]'
    );
    expect(cell).toHaveAttribute("aria-label", cell?.getAttribute("title"));
  });

  it("shows the represented candidature count next to each legend swatch, not just a color gradient (RGAA: never encode intensity by hue alone)", () => {
    const jobs = Array.from({ length: 10 }, () => ({ createdAt: new Date(2026, 7, 12) }));
    const days = buildHeatmapDays(jobs, new Date(2026, 7, 12));
    render(<ApplicationHeatmap days={days} />);
    // max = 10 candidatures on the busiest day -> level 5 legend swatch shows "10"
    expect(screen.getByText("10", { selector: "[data-legend-count]" })).toBeInTheDocument();
    // the empty (level 0) swatch always reads "0"
    expect(screen.getByText("0", { selector: "[data-legend-count]" })).toBeInTheDocument();
  });

  it("renders a 5-step intensity legend using the green --brand-positive scale (JOB-126)", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    const { container } = render(<ApplicationHeatmap days={days} />);
    const legendCells = container.querySelectorAll("[data-legend-cell]");
    // one empty swatch + 5 intensity levels
    expect(legendCells).toHaveLength(6);
    // le swatch vide (niveau 0) n'a pas de couleur inline (fond neutre via className)
    expect((legendCells[0] as HTMLElement).style.backgroundColor).toBe("");
    // chaque niveau non-vide utilise le token de marque vert, jamais les
    // anciens tokens violets --chart-*/--palette-orchidee
    for (const cell of Array.from(legendCells).slice(1)) {
      const bg = (cell as HTMLElement).style.backgroundColor;
      expect(bg).toContain("--brand-positive");
      expect(bg).not.toMatch(/--chart-|--palette-orchidee|--palette-poudre/);
    }
  });

  it("shows the month labels row by default", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    render(<ApplicationHeatmap days={days} />);
    expect(screen.getByTestId("heatmap-month-labels")).toBeInTheDocument();
  });

  describe("compact mode", () => {
    it("renders exactly the days it was given, without re-slicing the window (JOB-126: la fenêtre est décidée par l'appelant via buildHeatmapDays, pas par le composant)", () => {
      const days = buildHeatmapDays([], new Date(2026, 7, 15));
      const { container } = render(<ApplicationHeatmap days={days} compact />);
      const cells = container.querySelectorAll("[data-heatmap-cell]");
      expect(cells).toHaveLength(days.length);
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
