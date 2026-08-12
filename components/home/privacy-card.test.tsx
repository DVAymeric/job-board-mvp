import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrivacyCard } from "@/components/home/privacy-card";

describe("PrivacyCard", () => {
  it("renders the editorial content with the default tone", () => {
    render(<PrivacyCard />);
    expect(screen.getByText("100% local")).toBeInTheDocument();
    expect(
      screen.getByText("SQLite sur votre machine. Rien n'est envoyé ailleurs.")
    ).toBeInTheDocument();
    const card = screen.getByText("100% local").closest('[data-slot="bento-card"]');
    expect(card).toHaveAttribute("data-tone", "default");
  });
});
