import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeatmapBentoCard } from "@/components/analytics/heatmap-bento-card";
import { buildHeatmapDays } from "@/lib/heatmap";

describe("HeatmapBentoCard", () => {
  it("renders the card heading once (no duplicate title from the inner heatmap)", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12), 3);
    const { container } = render(<HeatmapBentoCard days={days} />);
    expect(screen.getByText("Régularité sur 12 mois")).toBeInTheDocument();
    expect(screen.getAllByText(/Fréquence de candidature/)).toHaveLength(1);
    expect(container.querySelectorAll("[data-heatmap-cell]")).toHaveLength(days.length);
  });

  it("uses the coarser 3-level color scale", () => {
    const days = buildHeatmapDays([], new Date(2026, 7, 12), 3);
    const { container } = render(<HeatmapBentoCard days={days} />);
    expect(container.querySelectorAll("[data-legend-cell]")).toHaveLength(4);
  });
});
