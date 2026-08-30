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
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    render(<ApplicationHeatmap days={days} />);
    // fixed absolute scale (0 to 5+), independent of the actual data
    for (const label of ["0", "1", "2", "3", "4", "5+"]) {
      expect(screen.getByText(label, { selector: "[data-legend-count]" })).toBeInTheDocument();
    }
  });

  it("keeps the same fixed 0-5+ legend regardless of how busy the busiest day in the window was (absolute scale, not relative to max)", () => {
    const jobs = Array.from({ length: 40 }, () => ({ createdAt: new Date(2026, 7, 12) }));
    const days = buildHeatmapDays(jobs, new Date(2026, 7, 12));
    render(<ApplicationHeatmap days={days} />);
    expect(screen.getByText("5+", { selector: "[data-legend-count]" })).toBeInTheDocument();
    expect(screen.queryByText("40", { selector: "[data-legend-count]" })).not.toBeInTheDocument();
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

  it("shows the day's count as visible text inside each cell, not just via title/aria-label (mockup: chiffre visible dans la case)", () => {
    const jobs = Array.from({ length: 4 }, () => ({ createdAt: new Date(2026, 7, 12) }));
    const days = buildHeatmapDays(jobs, new Date(2026, 7, 12));
    const { container } = render(<ApplicationHeatmap days={days} />);
    const cell = container.querySelector('[data-heatmap-cell][title*="12 août 2026"]');
    expect(cell).toHaveTextContent("4");
  });

  it("lays out cells on a fixed 10-column grid (3 rows for the 30-day window) that fills the full container width, not a fixed pixel size", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    const { container } = render(<ApplicationHeatmap days={days} />);
    const grid = container.querySelector("[data-heatmap-cell]")?.parentElement as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe("repeat(10, 1fr)");
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

    it("does not show the count as text inside cells (too small to stay legible)", () => {
      const jobs = Array.from({ length: 4 }, () => ({ createdAt: new Date(2026, 7, 12) }));
      const days = buildHeatmapDays(jobs, new Date(2026, 7, 12));
      const { container } = render(<ApplicationHeatmap days={days} compact />);
      const cell = container.querySelector('[data-heatmap-cell][title*="12 août 2026"]');
      expect(cell).toHaveTextContent("");
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
