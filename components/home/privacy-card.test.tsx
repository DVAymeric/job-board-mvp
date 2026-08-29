import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrivacyCard } from "@/components/home/privacy-card";

describe("PrivacyCard", () => {
  it("renders the editorial content with the default tone", () => {
    render(<PrivacyCard />);
    expect(screen.getByText("Vos données ne sont jamais revendues")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Vos candidatures restent hébergées sur nos serveurs et ne sont jamais partagées ni revendues à des tiers."
      )
    ).toBeInTheDocument();
    const card = screen
      .getByText("Vos données ne sont jamais revendues")
      .closest('[data-slot="bento-card"]');
    expect(card).toHaveAttribute("data-tone", "default");
  });

  it("never claims the data stays local or is stored in SQLite", () => {
    render(<PrivacyCard />);
    expect(screen.queryByText(/100% local/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SQLite/i)).not.toBeInTheDocument();
  });
});
