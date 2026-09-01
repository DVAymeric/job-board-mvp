import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CampaignsCard } from "@/components/harvester/campaigns-card";

describe("CampaignsCard", () => {
  it("shows an empty state and a create CTA when there are no campaigns", () => {
    render(<CampaignsCard count={0} />);
    expect(screen.getByTestId("campaigns-empty")).toBeInTheDocument();
    const link = screen.getByRole("button", { name: /créer une alerte/i });
    expect(link).toHaveAttribute("href", "/harvester/campaigns");
  });

  it("shows the campaign count and a manage CTA when campaigns exist", () => {
    render(<CampaignsCard count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByTestId("campaigns-empty")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gérer mes alertes/i })).toBeInTheDocument();
  });
});
