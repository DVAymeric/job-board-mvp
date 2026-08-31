import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutCard } from "@/components/harvester/about-card";

describe("AboutCard", () => {
  it("renders the editorial content with the muted tone", () => {
    render(<AboutCard />);
    expect(screen.getByText("Trouvez des offres automatiquement")).toBeInTheDocument();
    const card = screen.getByText("Trouvez des offres automatiquement").closest('[data-slot="bento-card"]');
    expect(card).toHaveAttribute("data-tone", "muted");
  });
});
