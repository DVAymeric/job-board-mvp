import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeatureGrid } from "@/components/home/feature-grid";

describe("FeatureGrid (JOB-123)", () => {
  it("renders the 3 features from the mockup, each with an icon, a title and a description", () => {
    const { container } = render(<FeatureGrid />);

    expect(
      screen.getByText("Toutes vos offres au même endroit")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Plus besoin de jongler entre dix onglets ouverts.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Un tableau simple pour suivre chaque étape")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Vous voyez d'un regard où en est chaque candidature.")
    ).toBeInTheDocument();

    expect(screen.getByText("Un rappel avant chaque entretien")).toBeInTheDocument();
    expect(screen.getByText("Jamais plus une relance oubliée.")).toBeInTheDocument();

    // icône + mot toujours ensemble (JOB-120) : 3 icônes décoratives, jamais
    // seules porteuses d'information (le titre texte suffit déjà seul).
    expect(container.querySelectorAll("svg")).toHaveLength(3);
  });

  it("lays out the 3 features in a responsive grid, 3 columns down to 1 (JOB-123)", () => {
    const { container } = render(<FeatureGrid />);
    const grid = container.firstElementChild;
    expect(grid?.className).toMatch(/\bsm:grid-cols-3\b/);
    expect(grid?.className).toMatch(/\bgrid-cols-1\b/);
  });

  it("uses body-text size (16px minimum, JOB-87) for the descriptions", () => {
    render(<FeatureGrid />);
    const description = screen.getByText(
      "Plus besoin de jongler entre dix onglets ouverts."
    );
    expect(description.className).toMatch(/\btext-base\b/);
    expect(description.className).not.toMatch(/\btext-xs\b/);
  });
});
