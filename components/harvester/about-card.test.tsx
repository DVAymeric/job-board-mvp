import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutCard } from "@/components/harvester/about-card";

describe("AboutCard", () => {
  it("renders the editorial content with the muted tone", () => {
    render(<AboutCard />);
    expect(screen.getByText("Collecte automatisée d'offres")).toBeInTheDocument();
    const card = screen.getByText("Collecte automatisée d'offres").closest('[data-slot="bento-card"]');
    expect(card).toHaveAttribute("data-tone", "muted");
  });
});
