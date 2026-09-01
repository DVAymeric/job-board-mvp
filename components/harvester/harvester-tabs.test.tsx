import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { HarvesterTabs } from "@/components/harvester/harvester-tabs";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/harvester/campaigns");
});

describe("HarvesterTabs", () => {
  it("renders links to all three harvester routes", () => {
    render(<HarvesterTabs />);
    expect(screen.getByRole("link", { name: "Vue d'ensemble" })).toHaveAttribute("href", "/harvester");
    expect(screen.getByRole("link", { name: "Alertes" })).toHaveAttribute("href", "/harvester/campaigns");
    expect(screen.getByRole("link", { name: "Nouvelles offres" })).toHaveAttribute("href", "/harvester/review");
  });

  it("highlights the current route", () => {
    render(<HarvesterTabs />);
    expect(screen.getByRole("link", { name: "Alertes" })).toHaveClass("text-heading");
    expect(screen.getByRole("link", { name: "Vue d'ensemble" })).not.toHaveClass("text-heading");
  });

  it("shows a count badge on the review queue tab when there are pending offers (JOB-106)", () => {
    render(<HarvesterTabs reviewQueueCount={3} />);
    const reviewLink = screen.getByRole("link", { name: /Nouvelles offres/ });
    expect(reviewLink).toHaveTextContent("3");
  });

  it("does not show a count badge when there are no pending offers", () => {
    render(<HarvesterTabs reviewQueueCount={0} />);
    const reviewLink = screen.getByRole("link", { name: "Nouvelles offres" });
    expect(reviewLink).not.toHaveTextContent("0");
  });

  it("does not show a count badge when no count is provided", () => {
    render(<HarvesterTabs />);
    expect(screen.getByRole("link", { name: "Nouvelles offres" })).toBeInTheDocument();
  });

  it("does not render a link to the discovery route — no longer part of the public nav (JOB-153)", () => {
    render(<HarvesterTabs />);
    expect(screen.queryByRole("link", { name: /Cibles découvertes/ })).not.toBeInTheDocument();
  });
});
