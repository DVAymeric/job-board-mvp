import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketingNav } from "@/components/home/marketing-nav";

describe("MarketingNav", () => {
  it("renders the JobTracker wordmark with a violet dot", () => {
    const { container } = render(<MarketingNav />);
    expect(screen.getByText("JobTracker")).toBeInTheDocument();
    expect(container.querySelector('[data-testid="marketing-nav-dot"]')).toBeInTheDocument();
  });

  it("renders links to Board, Analytics and the how-it-works section", () => {
    render(<MarketingNav />);
    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute(
      "href",
      "/board"
    );
    expect(screen.getByRole("link", { name: "Analytics" })).toHaveAttribute(
      "href",
      "/analytics"
    );
    expect(
      screen.getByRole("link", { name: "Comment ça marche" })
    ).toHaveAttribute("href", "#comment-ca-marche");
  });

  it("renders a filled CTA to open the app", () => {
    render(<MarketingNav />);
    const cta = screen.getByRole("link", { name: "Ouvrir l'app" });
    expect(cta).toHaveAttribute("href", "/board");
    expect(cta.className).toContain("bg-primary");
  });

  it("hides the nav links on narrow viewports, keeping logo and CTA", () => {
    render(<MarketingNav />);
    const linksNav = screen.getByRole("link", { name: "Board" }).closest("nav");
    expect(linksNav?.className).toContain("hidden");
  });

  it("uses an opaque light background regardless of theme", () => {
    const { container } = render(<MarketingNav />);
    const header = container.querySelector("header");
    expect(header?.className).toContain("bg-white");
  });
});
