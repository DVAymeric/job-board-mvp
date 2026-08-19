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
    expect(screen.getByRole("link", { name: "Campagnes" })).toHaveAttribute("href", "/harvester/campaigns");
    expect(screen.getByRole("link", { name: "File de revue" })).toHaveAttribute("href", "/harvester/review");
  });

  it("highlights the current route", () => {
    render(<HarvesterTabs />);
    expect(screen.getByRole("link", { name: "Campagnes" })).toHaveClass("text-heading");
    expect(screen.getByRole("link", { name: "Vue d'ensemble" })).not.toHaveClass("text-heading");
  });
});
