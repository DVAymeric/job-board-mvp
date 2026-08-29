import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading, { RECHERCHE_SKELETON_ROW_COUNT } from "@/app/recherche/loading";

describe("Recherche loading state (JOB-117)", () => {
  it("shows the real page title so the heading doesn't shift once data arrives", () => {
    render(<Loading />);
    expect(
      screen.getByRole("heading", { name: "Recherche d'offres" })
    ).toBeInTheDocument();
  });

  it("marks the loading region as busy for assistive tech", () => {
    render(<Loading />);
    expect(screen.getByLabelText("Chargement des offres")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("renders one avatar-shaped skeleton per placeholder row, matching JobResultRow's avatar size (size-13 rounded-xl)", () => {
    const { container } = render(<Loading />);
    const avatarSkeletons = container.querySelectorAll(
      '[data-slot="skeleton"].size-13.rounded-xl'
    );
    expect(avatarSkeletons).toHaveLength(RECHERCHE_SKELETON_ROW_COUNT);
  });

  it("renders skeleton placeholders for the search form fields", () => {
    const { container } = render(<Loading />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // 3 champs (label + input) + bouton + (avatar + titre + meta + 2 tags + CTA) * lignes
    expect(skeletons.length).toBeGreaterThan(RECHERCHE_SKELETON_ROW_COUNT * 5);
  });
});
