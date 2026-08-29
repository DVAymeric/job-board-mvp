import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "@/app/analytics/loading";

describe("Analytics loading state (JOB-117)", () => {
  it("shows the real page title and the static card labels so no text shifts once data arrives", () => {
    render(<Loading />);
    expect(screen.getByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByText("Vue d'ensemble")).toBeInTheDocument();
    expect(screen.getByText("Conversion clé")).toBeInTheDocument();
    expect(screen.getByText("Mois le plus actif")).toBeInTheDocument();
    expect(screen.getByText("Funnel de conversion")).toBeInTheDocument();
    expect(screen.getByText("Fréquence de candidature")).toBeInTheDocument();
  });

  it("marks the stats grid as busy for assistive tech", () => {
    render(<Loading />);
    expect(screen.getByLabelText("Chargement des statistiques")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("renders skeleton placeholders for every dynamic value normally shown by the bento tiles", () => {
    const { container } = render(<Loading />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(10);
  });
});
