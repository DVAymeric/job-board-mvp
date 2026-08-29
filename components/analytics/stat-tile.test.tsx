import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatTile } from "@/components/analytics/stat-tile";

describe("StatTile", () => {
  it("renders the label and the value", () => {
    render(<StatTile label="Candidatures envoyées" value={18} />);
    expect(screen.getByText("Candidatures envoyées")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("renders a string value as-is (e.g. a formatted percentage)", () => {
    render(<StatTile label="Taux de conversion" value="42%" />);
    expect(screen.getByText("42%")).toBeInTheDocument();
  });

  it("uses the featured-value typography scale (JOB-87: font-heading text-2xl)", () => {
    render(<StatTile label="Entretiens obtenus" value={5} />);
    const value = screen.getByText("5");
    expect(value.className).toMatch(/\bfont-heading\b/);
    expect(value.className).toMatch(/\btext-2xl\b/);
  });

  it("never uses an aggressive alert color for the warn tone (JOB-99/no culpabilizing tone)", () => {
    render(<StatTile label="Relances à faire" value={2} tone="warn" />);
    const value = screen.getByText("2");
    expect(value.className).toMatch(/\btext-warn\b/);
    expect(value.className).not.toMatch(/destructive|red/);
  });
});
