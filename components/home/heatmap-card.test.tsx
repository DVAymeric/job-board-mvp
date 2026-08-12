import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeatmapCard } from "@/components/home/heatmap-card";
import { buildHeatmapDays } from "@/lib/heatmap";

describe("HeatmapCard", () => {
  it("renders the heatmap in compact mode, without the legend", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    const { container } = render(<HeatmapCard days={days} />);
    expect(container.querySelectorAll("[data-heatmap-cell]").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-legend-cell]")).toHaveLength(0);
  });

  it("renders the card title", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12));
    render(<HeatmapCard days={days} />);
    expect(screen.getByText("Heatmap d'activité")).toBeInTheDocument();
  });
});
